// @flow
import { getConnectionManager, Repository } from 'typeorm';
import { User } from '../models/User';
import { Session } from '../models/Session';
import UserSessionsRepo from '../repos/UserSessionsRepo';
import appDevUtils from '../utils/appDevUtils';

const db = (): Repository<User> => {
  return getConnectionManager().get().getRepository(User);
};

// Create a user without fields
const createDummyUser = async (id: string): Promise<User> => {
  try {
    const user = await db().persist(User.dummy(id));
    return user;
  } catch (e) {
    throw new Error('Problem creating user!');
  }
};

// Create a user from google creds
const createUser = async (fields: Object): Promise<User> => {
  try {
    const user = await db().persist(User.fromGoogleCreds(fields));
    return user;
  } catch (e) {
    throw new Error('Problem creating user!');
  }
};

const createUserWithFields = async (googleId: string, firstName: string,
  lastName: string, email: string): Promise<User> => {
  try {
    const user = new User();
    user.googleId = googleId;
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;
    user.netId = appDevUtils.netIdFromEmail(email);

    await db().persist(user);
    return user;
  } catch (e) {
    throw new Error('Problem creating user!');
  }
};

// Get a user by Id
const getUserById = async (id: number): Promise<?User> => {
  try {
    const user = await db().findOneById(id);
    return user;
  } catch (e) {
    throw new Error(`Problem getting user by id: ${id}!`);
  }
};

// Get a user by googleId (a.k.a. unique key of their Google account)
const getUserByGoogleId = async (googleId: string): Promise<?User> => {
  try {
    const user = await db().createQueryBuilder('users')
      .where('users.googleId = :googleId', { googleId: googleId })
      .getOne();
    return user;
  } catch (e) {
    throw new Error('Problem getting user by google ID!');
  }
};

// Get users
const getUsers = async (): Promise<Array<?User>> => {
  try {
    const users = await db().createQueryBuilder('users')
      .getMany();
    return users;
  } catch (e) {
    throw new Error('Problem getting users!');
  }
};

// Get users from list of ids but filters out users with ids in filter
const getUsersFromIds = async (userIds: number[], filter: ?number[]):
Promise<?Array<User>> => {
  try {
    var ids = '(' + String(userIds) + ')';
    var query = 'users.id IN ' + ids;
    if (filter && filter.length > 0) {
      var f = '(' + String(filter) + ')';
      query += ' AND users.id not IN ' + f;
    }
    const users = await db().createQueryBuilder('users')
      .where(query)
      .getMany();
    return users;
  } catch (e) {
    throw new Error('Problem getting users from ids!');
  }
};

// Get users from list of googleIds
const getUsersByGoogleIds = async (googleIds: string[]):
  Promise<?Array<User>> => {
  try {
    var ids = '(' + String(googleIds) + ')';
    const users = await db().createQueryBuilder('users')
      .where('"users.googleId" IN ' + ids)
      .getMany();
    return users;
  } catch (e) {
    throw new Error('Problem getting users from googleIds!');
  }
};

// Delete a user by Id
const deleteUserById = async (id: number) => {
  try {
    const user = await db().findOneById(id);
    await UserSessionsRepo.deleteSessionFromUserId(id);
    await db().remove(user);
  } catch (e) {
    throw new Error(`Problem deleting user by id: ${id}!`);
  }
};

// Get sessions (one offs) by userId
const getSessionsById = async (id: number, role: ?string):
    Promise<Array<?Session>> => {
  try {
    const user = await db().createQueryBuilder('users')
      .leftJoinAndSelect('users.memberSessions', 'memberSessions')
      .leftJoinAndSelect('users.adminSessions', 'adminSessions')
      .where('users.id = :userId')
      // .where('NOT "memberSessions.isGroup"')
      // .where('NOT "adminSessions.isGroup"')
      .setParameters({ userId: id })
      .getOne();
    if (role === 'admin') {
      return user.adminSessions;
    } else if (role === 'member') {
      return user.memberSessions;
    } else {
      return user.memberSessions.concat(user.adminSessions);
    }
  } catch (e) {
    throw new Error(`Problem getting member sessions for user: ${id}`);
  }
};

// Get groups by userId
const getGroupsById = async (id: number, role: ?string):
    Promise<Array<?Session>> => {
  try {
    const user = await db().createQueryBuilder('users')
      .leftJoinAndSelect('users.memberSessions', 'memberSessions')
      .leftJoinAndSelect('users.adminSessions', 'adminSessions')
      .where('users.id = :userId')
      .where('"memberSessions.isGroup"')
      .where('adminSessions.isGroup')
      .setParameters({ userId: id })
      .getOne();
    if (role === 'admin') {
      return user.adminSessions;
    } else if (role === 'member') {
      return user.memberSessions;
    } else {
      return user.memberSessions.concat(user.adminSessions);
    }
  } catch (e) {
    throw new Error(`Problem getting member groups for user: ${id}`);
  }
};

export default {
  getUsers,
  createUser,
  createUserWithFields,
  createDummyUser,
  getUserById,
  getUserByGoogleId,
  getUsersByGoogleIds,
  getUsersFromIds,
  deleteUserById,
  getSessionsById,
  getGroupsById
};
