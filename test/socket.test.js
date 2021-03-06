import express from 'express';
import http from 'http';
import SocketIO from 'socket.io';

import constants from '../src/utils/Constants';
import dbConnection from '../src/db/DbConnection';
import GroupSocket from '../src/GroupSocket';
import GroupsRepo from '../src/repos/GroupsRepo';

let groupSocket;
let group;
let mockClient;
let createdPollID;

const uuid = 'user1';
const poll = {
  answerChoices: [{
    index: 0,
    text: 'one',
    count: 0,
  },
  {
    index: 0,
    text: 'two',
    count: 0,
  }],
  correctAnswer: 0,
  state: constants.POLL_STATES.LIVE,
  text: 'How do you spell 1?',
};

// Connects to db before running tests and does setup
beforeAll(async () => {
  await dbConnection().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error connecting to database');
    process.exit();
  });
  const server: http.Server = http.createServer(express());
  const io = SocketIO(server);
  group = await GroupsRepo.createGroup('Group 1', 'ABC123', null, null);
  groupSocket = new GroupSocket({ group, nsp: io.of(`/${group.uuid}`), onClose: null });
  mockClient = groupSocket.nsp.to('members');
});

test('Start poll', () => {
  // eslint-disable-next-line no-underscore-dangle
  groupSocket._startPoll(poll);
  expect(groupSocket.current).toMatchObject({
    answerChoices: poll.answerChoices,
    correctAnswer: poll.correctAnswer,
    state: poll.state,
    text: poll.text,
    answers: {},
  });
});

test('Answer poll', () => {
  const submittedAnswer = 0;
  // eslint-disable-next-line no-underscore-dangle
  groupSocket._answerPoll(mockClient, uuid, submittedAnswer);

  const userAnswers = groupSocket.current.answers[uuid];
  expect(userAnswers.length).toBe(1);
  expect(userAnswers[0]).toBe(submittedAnswer);

  const pollChoice = groupSocket.current.answerChoices.find(p => p.index === submittedAnswer);
  expect(pollChoice.count).toBe(1);
});

test('Change answer', () => {
  const submittedAnswer = 0;
  // eslint-disable-next-line no-underscore-dangle
  groupSocket._answerPoll(null, uuid, submittedAnswer);

  const userAnswers = groupSocket.current.answers[uuid];
  expect(userAnswers.length).toBe(1);
  expect(userAnswers[0]).toBe(submittedAnswer);

  groupSocket.current.answerChoices.forEach((pollChoice) => {
    if (pollChoice.index === submittedAnswer) {
      expect(pollChoice.count).toBe(1);
    } else {
      expect(pollChoice.count).toBe(0);
    }
  });
});

test('Get current poll (user)', () => {
  // eslint-disable-next-line no-underscore-dangle
  const currPoll = groupSocket._currentPoll('member');

  expect(currPoll.answerChoices).toEqual(poll.answerChoices.map(a => ({ ...a, count: null })));
  expect(currPoll.correctAnswer).toBe(poll.correctAnswer);
  expect(currPoll.state).toBe(poll.state);
  expect(currPoll.text).toBe(poll.text);
  expect(currPoll.userAnswers[uuid]).toEqual([0]);
});

test('Get current poll (admin)', () => {
  // eslint-disable-next-line no-underscore-dangle
  const currPoll = groupSocket._currentPoll('admin');

  expect(currPoll.answerChoices).toEqual(poll.answerChoices);
  expect(currPoll.correctAnswer).toBe(poll.correctAnswer);
  expect(currPoll.state).toBe(poll.state);
  expect(currPoll.text).toBe(poll.text);
  expect(currPoll.userAnswers[uuid]).toEqual([0]);
});

test('Delete live poll', () => {
  // eslint-disable-next-line no-underscore-dangle
  groupSocket._deleteLivePoll();
  expect(groupSocket.current).toBeNull();
});

test('Start poll 2', () => {
  // eslint-disable-next-line no-underscore-dangle
  groupSocket._startPoll(poll);
  expect(groupSocket.current).toMatchObject({
    answerChoices: poll.answerChoices,
    correctAnswer: poll.correctAnswer,
    state: poll.state,
    text: poll.text,
    answers: {},
  });
});

test('End poll 2', async () => {
  // eslint-disable-next-line no-underscore-dangle
  await groupSocket._endPoll();

  expect(groupSocket.current).toBeNull();

  const polls = await GroupsRepo.getPolls(group.uuid);
  const createdPoll = polls[0];
  expect(createdPoll.state).toBe(constants.POLL_STATES.ENDED);
  createdPollID = createdPoll.uuid;
});

test('Delete poll', async () => {
  // eslint-disable-next-line no-underscore-dangle
  await groupSocket._deletePoll(createdPollID);

  const polls = await GroupsRepo.getPolls(group.uuid);
  expect(polls.length).toBe(0);
});

// Teardown
afterAll(async () => {
  await GroupsRepo.deleteGroupByID(group.uuid);
  // eslint-disable-next-line no-console
  console.log('Passed all socket tests');
});
