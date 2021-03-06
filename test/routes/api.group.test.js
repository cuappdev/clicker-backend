import request from 'request-promise-native';
import axios from 'axios';
import dbConnection from '../../src/db/DbConnection';
import UsersRepo from '../../src/repos/UsersRepo';
import UserSessionsRepo from '../../src/repos/UserSessionsRepo';
import GroupsRepo from '../../src/repos/GroupsRepo';
import PollsRepo from '../../src/repos/PollsRepo';
import Poll from '../../src/models/Poll';

const {
  get, post, del, put,
} = require('./lib');

// Groups
// Must be running server to test

const opts = () => ({ name: 'Test group' });
const email = 'usertest';
let adminToken;
let userToken;
let session;
let group;
let adminID;
let userID;

beforeAll(async () => {
  await dbConnection().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error connecting to database');
    process.exit();
  });
});

beforeEach(async () => {
  const user = await UsersRepo.createDummyUser(email);
  adminID = user.uuid;
  session = await UserSessionsRepo.createOrUpdateSession(user, null, null);
  adminToken = session.sessionToken;

  await request(post('/sessions/', opts(), adminToken)).then((result) => {
    expect(result.success).toBe(true);
    group = result.data;
  });

  const user2 = await UsersRepo.createDummyUser('dummy');
  userID = user2.uuid;
  userToken = (await UserSessionsRepo.createOrUpdateSession(user2, null, null)).sessionToken;
});

test('Create group', async () => {
  await request(post('/sessions/', opts(), adminToken)).then((result) => {
    expect(result.success).toBe(true);
  });
});

test('Get single group', async () => {
  await request(get(`/sessions/${group.id}/`, adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    expect(group).toMatchObject(getres.data);
  });
});

test('Get groups for admin', async () => {
  await request(get('/sessions/all/admin/', adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    const groupRes = getres.data[0];
    expect(group.id).toBe(groupRes.id);
    expect(group.name).toBe(groupRes.name);
    expect(group.code).toBe(groupRes.code);
    expect(group.updatedAt).toBe(groupRes.updatedAt);
  });
});

test('Add admins to group', async () => {
  const body = {
    adminIDs: [userID],
  };
  await request(post(`/sessions/${group.id}/admins/`, body,
    adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
  });
});

test('Get admins for group', async () => {
  await request(get(`/sessions/${group.id}/admins/`, adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    const admins = getres.data;
    expect(admins.length).toBe(1);
    expect(admins[0].id).toBe(adminID);
  });
});

test('Remove admin from group', async () => {
  const body = {
    adminIDs: [userID],
  };
  await request(put(`/sessions/${group.id}/admins/`, body,
    adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
  });
});

test('Add members to group', async () => {
  const body = {
    memberIDs: [userID],
  };
  await request(post(`/sessions/${group.id}/members/`, body,
    adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
  });
});

test('Get groups as member', async () => {
  await GroupsRepo.addUsersByIDs(group.id, [userID]);

  await request(get('/sessions/all/member/', userToken)).then((getres) => {
    expect(getres.success).toBe(true);
    expect(getres.data.length).toBe(1);
    const groupRes = getres.data[0];
    expect(group.id).toBe(groupRes.id);
    expect(group.name).toBe(groupRes.name);
    expect(group.code).toBe(groupRes.code);
    expect(group.updatedAt).toBe(groupRes.updatedAt);
  });
});

test('Get members of group', async () => {
  await GroupsRepo.addUsersByIDs(group.id, [userID]);

  await request(get(`/sessions/${group.id}/members/`, adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    const members = getres.data;
    expect(members.length).toBe(1);
    expect(members[0].id).toBe(userID);
  });
});

test('Leave group', async () => {
  await GroupsRepo.addUsersByIDs(group.id, [userID]);

  await request(del(`/sessions/${group.id}/members/`, userToken),
    (error, res, body) => {
      expect(body.success).toBe(true);
    });

  await request(get(`/sessions/${group.id}/members/`, adminToken),
    (error, res, body) => {
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(0);
    });

  const postBody = {
    memberIDs: [userID],
  };
  await request(post(`/sessions/${group.id}/members/`, postBody, adminToken),
    (error, res, body) => {
      expect(body.success).toBe(true);
    });
});

test('Remove member from group', async () => {
  await GroupsRepo.addUsersByIDs(group.id, [userID]);

  const body = {
    memberIDs: [userID],
  };
  await request(put(`/sessions/${group.id}/members`, body,
    adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
  });
});

test('Get groups for admin', async () => {
  await request(get('/sessions/all/admin/', adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    const groupRes = getres.data[0];
    expect(group.id).toBe(groupRes.id);
    expect(group.name).toBe(groupRes.name);
    expect(group.code).toBe(groupRes.code);
  });
});

test('Update group', async () => {
  await request(put(`/sessions/${group.id}`, { name: 'New group' }, adminToken)).then((getres) => {
    expect(getres.success).toBe(true);
    expect(getres.data.name).toBe('New group');
  });
});

test('Update group with invalid adminToken', async () => {
  await request(put(`/sessions/${group.id}`, { name: 'New group' }, 'invalid'))
    .catch((e) => {
      expect(e.statusCode).toBe(401);
    });
});

test('Download csv', async () => {
  const u1 = await UsersRepo.createUserWithFields('u', '1', 'u1@example.com');
  const u2 = await UsersRepo.createUserWithFields('u', '2', 'u2@example.com');

  const g = await GroupsRepo.getGroupByID(group.id);
  let polls: Array<?Poll> = await GroupsRepo.getPolls(group.id);
  console.log(`found ${polls.length} polls`);
  const p1 = await PollsRepo.createPoll(
    'Poll 1', g, [{ index: 0, text: 'Saturn' }, { index: 1, text: 'Mars' }],
    0, { [u1.uuid]: [0], [u2.uuid]: [1] }, 'ended',
  );
  polls = await GroupsRepo.getPolls(group.id);
  console.log(`found ${polls.length} polls`);
  const p2 = await PollsRepo.createPoll(
    'Poll 2', g, [{ index: 0, text: 'Earth' }, { index: 1, text: 'Venus' }],
    1, { [u1.uuid]: [1], [u2.uuid]: [0] }, 'ended',
  );

  await GroupsRepo.addUsersByIDs(group.id, [u1.uuid, u2.uuid]);

  const today = new Date();

  let resultCMS = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  let resultCanvas = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  expect(resultCMS.status).toBe(200);
  expect(resultCMS.data).toBe(`NetID,${today.toDateString()}\nu1,2\nu2,2\n`);

  expect(resultCanvas.status).toBe(200);
  expect(resultCanvas.data).toBe(`Student,ID,${today.toDateString()}\nu 1,u1,2\nu 2,u2,2\n`);

  const u3 = await UsersRepo.createUserWithFields('u', '3', 'u3@example.com');
  await GroupsRepo.addUsersByIDs(group.id, [u3.uuid]);

  resultCMS = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  resultCanvas = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  expect(resultCMS.status).toBe(200);
  expect(resultCMS.data)
    .toBe(`NetID,${today.toDateString()}\nu1,2\nu2,2\nu3,0\n`);

  expect(resultCanvas.status).toBe(200);
  expect(resultCanvas.data).toBe(`Student,ID,${today.toDateString()}\nu 1,u1,2\nu 2,u2,2\nu 3,u3,0\n`);

  const p3 = await PollsRepo.createPoll(
    'Poll 3', g, [{ index: 0, text: 'Earth' }, { index: 1, text: 'Venus' }],
    1, { [u3.uuid]: [0] }, 'ended',
  );

  resultCMS = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  resultCanvas = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  expect(resultCMS.status).toBe(200);
  expect(resultCMS.data)
    .toBe(`NetID,${today.toDateString()}\nu1,2\nu2,2\nu3,1\n`);

  expect(resultCanvas.status).toBe(200);
  expect(resultCanvas.data).toBe(`Student,ID,${today.toDateString()}\nu 1,u1,2\nu 2,u2,2\nu 3,u3,1\n`);

  await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [],
    },
  }).catch((e) => {
    expect(e.response.status).toBe(400);
  });

  await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [],
    },
  }).catch((e) => {
    expect(e.response.status).toBe(400);
  });

  await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'badformat',
      dates: [today],
    },
  }).catch((e) => {
    expect(e.response.status).toBe(406);
  });

  const badDate = new Date('2011-10-10T14:48:00');

  resultCMS = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [badDate],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  resultCanvas = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [badDate],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  expect(resultCMS.data)
    .toBe(`NetID,${badDate.toDateString()}\nu1,0\nu2,0\nu3,0\n`);

  expect(resultCanvas.data).toBe(`Student,ID,${badDate.toDateString()}\nu 1,u1,0\nu 2,u2,0\nu 3,u3,0\n`);

  resultCMS = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'cmsx',
      dates: [badDate, today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  resultCanvas = await axios.get(`http://localhost:3000/api/v2/sessions/${group.id}/csv`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    params: {
      format: 'canvas',
      dates: [badDate, today],
    },
  }).catch((e) => {
    console.log(e);
    expect(e).toBe(null);
  });

  expect(resultCMS.data)
    .toBe(`NetID,${badDate.toDateString()},${today.toDateString()}\nu1,0,2\nu2,0,2\nu3,0,1\n`);

  expect(resultCanvas.data)
    .toBe(`Student,ID,${badDate.toDateString()},${today.toDateString()}\nu 1,u1,0,2\nu 2,u2,0,2\nu 3,u3,0,1\n`);

  console.log(`NetID,${badDate.toDateString()},${today.toDateString()}\nu1,0,2\nu2,0,2\nu3,0,1\n`);

  await PollsRepo.deletePollByID(p1.uuid);
  await PollsRepo.deletePollByID(p2.uuid);
  await PollsRepo.deletePollByID(p3.uuid);

  await GroupsRepo.removeUserByGroupID(group.id, u1.uuid);
  await GroupsRepo.removeUserByGroupID(group.id, u2.uuid);
  await GroupsRepo.removeUserByGroupID(group.id, u3.uuid);

  await UsersRepo.deleteUserByID(u1.uuid);
  await UsersRepo.deleteUserByID(u2.uuid);
  await UsersRepo.deleteUserByID(u3.uuid);
});

test('Delete group with invalid adminToken', async () => {
  await request(del(`/sessions/${group.id}`, 'invalid'))
    .catch((e) => {
      expect(e.statusCode).toBe(401);
    });
});

test('Delete group', async () => {
  const result = await request(del(`/sessions/${group.id}`, adminToken));
  expect(result.success).toBe(true);
});

afterEach(async () => {
  await request(del(`/sessions/${group.id}`, adminToken));
  await UsersRepo.deleteUserByID(adminID);
  await UserSessionsRepo.deleteSession(session.uuid);
  await UsersRepo.deleteUserByID(userID);
});

afterAll(async () => {
  // eslint-disable-next-line no-console
  console.log('Passed all group route tests');
});
