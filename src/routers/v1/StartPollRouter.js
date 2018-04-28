// @flow
import AppDevRouter from '../../utils/AppDevRouter';
import constants from '../../utils/constants';
import SessionsRepo from '../../repos/SessionsRepo';
import {Request} from 'express';
import type { APIPoll } from './APITypes';

class StartPollRouter extends AppDevRouter<APIPoll> {
  constructor () {
    super(constants.REQUEST_TYPES.POST, false);
  }

  getPath (): string {
    return '/start/poll/';
  }

  async content (req: Request) {
    const id = req.body.id;
    // const deviceId = req.body.deviceId;
    const code = req.body.code;
    var name = req.body.name;

    if (!name) name = '';
    var poll = await SessionsRepo.getSessionById(id);

    if (!(id || code)) {
      throw new Error('Poll id, or code and device id required.');
    }

    if (!id) {
      poll = await SessionsRepo.createSession(name, code, null);
    }

    if (!poll) {
      throw new Error(`No poll with id ${id} found.`);
    }

    await req.app.sessionManager.startNewSession(poll);

    return {
      node: {
        id: poll.id,
        name: poll.name,
        code: poll.code
      }
    };
  }
}

export default new StartPollRouter().router;