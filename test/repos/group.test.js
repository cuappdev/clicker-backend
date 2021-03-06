import GroupsRepo from '../../src/repos/GroupsRepo';
import UsersRepo from '../../src/repos/UsersRepo';
import PollsRepo from '../../src/repos/PollsRepo';
import dbConnection from '../../src/db/DbConnection';
import Group from '../../src/models/Group';

let code;
let code2;
let group: Group;
let group2: Group;
let uuid;
let uuid2;
let user;
let user2;
let user3;
let user4;

// Connects to db before running tests and does setup
beforeAll(async () => {
  await dbConnection().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error connecting to database');
    process.exit();
  });
});

beforeEach(async () => {
  code = GroupsRepo.createCode();
  code2 = GroupsRepo.createCode();

  user = await UsersRepo.createDummyUser('grouptest1');
  user2 = await UsersRepo.createDummyUser('grouptest2');
  user3 = await UsersRepo.createDummyUser('grouptest3');
  user4 = await UsersRepo.createDummyUser('grouptest4');

  group = await GroupsRepo.createGroup('Group', code, user);
  group2 = await GroupsRepo.createGroup('NewGroup', code2);

  uuid = group.uuid;
  uuid2 = group2.uuid;
});

test('Create Group', async () => {
  expect(group.name).toBe('Group');
  expect(group.code).toBe(code);
  expect(group.admins.length).toEqual(1);
  expect(group.admins[0].uuid).toBe(user.uuid);
  expect(group.members.length).toEqual(0);

  expect(group2.admins.length).toEqual(0);
  expect(group.members.length).toEqual(0);
});

test('Get Group by ID', async () => {
  const g = await GroupsRepo.getGroupByID(uuid);
  expect(g.name).toBe('Group');
  expect(g.code).toBe(code);

  const g2 = await GroupsRepo.getGroupByID(uuid2);
  expect(g2.name).toBe('NewGroup');
  expect(g2.code).toBe(code2);
});

test('Get Group by Code', async () => {
  const tempid = await GroupsRepo.getGroupID(code);
  expect(tempid).toBe(uuid);
});

test('Update Group', async () => {
  const g = await GroupsRepo.updateGroupByID(uuid, 'Update Group');
  expect(g.uuid).toBe(uuid);
  expect(g.name).toBe('Update Group');
});

test('Get Admins from Group', async () => {
  const admins = await GroupsRepo.getUsersByGroupID(uuid, 'admin');
  expect(admins.length).toEqual(1);
  expect(admins[0].uuid).toBe(user.uuid);

  const admins2 = await GroupsRepo.getUsersByGroupID(uuid2, 'admin');
  expect(admins2.length).toEqual(0);
});

test('Add Admin to Group by ID', async () => {
  const { admins } = await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'admin');
  expect(admins.length).toEqual(2);
  expect(admins[1].uuid).toBe(user2.uuid);

  const g = await GroupsRepo.addUsersByIDs(uuid2, [user3.uuid, user4.uuid], 'admin');
  expect(g.admins.length).toEqual(2);
  expect(g.admins[0].uuid).toBe(user3.uuid);
  expect(g.admins[1].uuid).toBe(user4.uuid);
});

test('Remove Admin from Group', async () => {
  const g = await GroupsRepo.removeUserByGroupID(uuid, [user2.uuid], 'admin');
  expect(g.admins.length).toEqual(1);
  expect(g.admins[0].uuid).toBe(user.uuid);

  expect(await GroupsRepo.isAdmin(uuid, user2)).toBe(false);
  expect(await GroupsRepo.isMember(uuid, user2)).toBe(false);
  expect(await GroupsRepo.isAdmin(uuid, user)).toBe(true);
  expect(await GroupsRepo.isMember(uuid, user)).toBe(false);

  await GroupsRepo.removeUserByGroupID(uuid2, [user3.uuid], 'admin');
  const g2 = await GroupsRepo.removeUserByGroupID(uuid2, [user4.uuid], 'admin');
  expect(g2.admins.length).toEqual(0);
});

test('Add Admin to Group by id', async () => {
  const { admins } = (await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'admin'));
  expect(admins.length).toEqual(2);
  expect(admins[1].uuid).toBe(user2.uuid);

  const g = await GroupsRepo.removeUserByGroupID(uuid, [user2.uuid], 'admin');
  expect(g.admins.length).toEqual(1);
  expect(g.uuid).toEqual(group.uuid);

  const uuids = [user3.uuid, user4.uuid];
  group2 = await GroupsRepo.addUsersByIDs(uuid2, uuids, 'admin');
  expect(group2.admins.length).toEqual(2);
  expect(group2.admins[0].uuid).toBe(user3.uuid);
  expect(group2.admins[1].uuid).toBe(user4.uuid);

  await GroupsRepo.removeUserByGroupID(uuid2, [user3.uuid], 'admin');
  group2 = await GroupsRepo.removeUserByGroupID(uuid2, [user4.uuid], 'admin');
  expect(group2.admins.length).toEqual(0);
});

test('Add Member to Group by id', async () => {
  const { members } = (await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'member'));
  expect(members.length).toEqual(1);
  expect(members[0].uuid).toBe(user2.uuid);

  const g = await GroupsRepo.addUsersByIDs(uuid2, [user3.uuid, user4.uuid]);
  expect(g.members.length).toEqual(2);
  expect(g.members[0].uuid).toBe(user3.uuid);
  expect(g.members[1].uuid).toBe(user4.uuid);
});

test('Get Members of Group', async () => {
  await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'member');
  const members = await GroupsRepo.getUsersByGroupID(uuid, 'member');
  expect(members.length).toEqual(1);
  expect(members[0].uuid).toBe(user2.uuid);

  await GroupsRepo.addUsersByIDs(uuid2, [user3.uuid, user4.uuid]);
  const members2 = await GroupsRepo.getUsersByGroupID(uuid2, 'member');
  const members2UUID = members2.map(member => member.uuid);
  expect(members2.length).toEqual(2);
  expect(members2UUID).toContain(user3.uuid);
  expect(members2UUID).toContain(user4.uuid);
});

test('Get All Users of Group', async () => {
  await GroupsRepo.addUsersByIDs(uuid, [user.uuid], 'admin');
  await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'member');

  const users = await GroupsRepo.getUsersByGroupID(uuid);
  expect(users.length).toEqual(2);
  expect(users[0].uuid).toBe(user.uuid);
  expect(users[1].uuid).toBe(user2.uuid);

  await GroupsRepo.addUsersByIDs(uuid2, [user3.uuid, user4.uuid]);

  const users2 = await GroupsRepo.getUsersByGroupID(uuid2);
  expect(users2.length).toEqual(2);
});

test('Remove Member from Group', async () => {
  const g = await GroupsRepo.removeUserByGroupID(uuid, [user2.uuid], 'member');
  expect(g.members.length).toEqual(0);
  // ({ uuid } = group);
  expect(g.uuid).toEqual(group.uuid);

  await GroupsRepo.removeUserByGroupID(uuid2, [user3.uuid], 'member');
  const g2 = await GroupsRepo.removeUserByGroupID(uuid2, [user4.uuid]);
  expect(g2.members.length).toEqual(0);
});

test('Add Members to Group by ID', async () => {
  let { members } = (await GroupsRepo.addUsersByIDs(uuid, [user2.uuid], 'member'));
  expect(members.length).toEqual(1);
  expect(members[0].uuid).toBe(user2.uuid);

  ({ members } = await GroupsRepo.addUsersByIDs(uuid, [user3.uuid, user4.uuid]));
  expect(members.length).toEqual(3);

  let g = await GroupsRepo.removeUserByGroupID(uuid, [user3.uuid], 'member');
  expect(g.uuid).toEqual(group.uuid);

  g = await GroupsRepo.removeUserByGroupID(uuid, [user4.uuid], 'member');
  expect(g.uuid).toEqual(group.uuid);
});

test('Get Polls from Group', async () => {
  let polls = await GroupsRepo.getPolls(uuid);
  expect(polls.length).toEqual(0);

  const answerChoices1 = [{ index: 0, text: 'blue', count: 1 }];
  const answerChoices1WithoutCounts = [{ index: 0, text: 'blue' }];

  const poll = await PollsRepo.createPoll('Poll', group, answerChoices1, -1, null, 'ended');
  polls = await GroupsRepo.getPolls(uuid);
  expect(polls.length).toEqual(1);
  expect(polls[0].uuid).toBe(poll.uuid);
  expect(polls[0].answerChoices).toEqual(answerChoices1WithoutCounts);// if member, hide results
  polls = await GroupsRepo.getPolls(uuid, false); // if admin, don't hide results
  expect(polls[0].answerChoices).toEqual(answerChoices1);

  await PollsRepo.deletePollByID(poll.uuid);
});

test('Delete Group', async () => {
  await GroupsRepo.deleteGroupByID(uuid);
  await GroupsRepo.deleteGroupByID(uuid2);
  expect(await GroupsRepo.getGroupByID(uuid)).not.toBeDefined();
  expect(await GroupsRepo.getGroupByID(uuid2)).not.toBeDefined();
});

// Teardown
afterEach(async () => {
  await UsersRepo.deleteUserByID(user.uuid);
  await UsersRepo.deleteUserByID(user2.uuid);
  await UsersRepo.deleteUserByID(user3.uuid);
  await UsersRepo.deleteUserByID(user4.uuid);

  await GroupsRepo.deleteGroupByID(uuid);
  await GroupsRepo.deleteGroupByID(uuid2);
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log('Passed all group tests');
});
