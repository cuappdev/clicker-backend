import { Poll } from './models/Poll';
import PollSocket from './PollSocket';
import SocketIO from 'socket.io';

class PollManager {
  /**
   * All the polls currently running.
   */
  pollSockets: Array<PollSocket> = []
  io: SocketIO.Server

  constructor (server) {
    this.io = SocketIO(server);
  }

  async startNewPoll (poll: Poll): void {
    const nsp = this.io.of(`/${poll.id}`);
    this.pollSockets.push(new PollSocket({
      poll: poll,
      nsp: nsp,
      onClose: () => {
        this.endPoll(poll);
      }
    }));
  }

  endPoll (poll: Poll, save: Boolean): void {
    const index = this.pollSockets.findIndex(x => {
      if (!x || !x.poll) return false;
      return (x.poll.id === poll.id);
    });

    if (index !== -1) {
      const socket = this.pollSockets[index];

      if (socket.closing) return;
      socket.closing = true;

      if (save) {
        socket.savePoll();
      }

      const connectedSockets = Object.keys(socket.nsp.connected);
      connectedSockets.forEach((id) => {
        socket.nsp.connected[id].disconnect();
      });
      socket.nsp.removeAllListeners();

      this.pollSockets.splice(index, 1);
      delete this.io.nsps[`/${poll.id}`];
    }
  }

  livePolls (pollCodes: Array<string>): Array<Poll> {
    return this.pollSockets
      .filter(x => {
        if (x && x.poll) {
          return pollCodes.includes(x.poll.code);
        } else {
          return false;
        }
      })
      .map((l : PollSocket) => {
        return l.poll;
      });
  }
}

export default PollManager;
