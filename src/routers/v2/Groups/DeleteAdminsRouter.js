// @flow
import { Request } from 'express';
import AppDevRouter from '../../../utils/AppDevRouter';
import LogUtils from '../../../utils/LogUtils';
import constants from '../../../utils/Constants';
import GroupsRepo from '../../../repos/GroupsRepo';

class DeleteAdminsRouter extends AppDevRouter<Object> {
    constructor() {
        super(constants.REQUEST_TYPES.PUT);
    }

    getPath(): string {
        return '/groups/:id/admins/';
    }

    async content(req: Request) {
        const groupId = req.params.id;
        const { user } = req;
        const adminIds = JSON.parse(req.body.adminIds);

        if (!adminIds) throw LogUtils.logError('List of admin ids missing!');

        if (!await GroupsRepo.isAdmin(groupId, user)) {
            throw LogUtils.logError('You are not authorized to remove admins from this group!');
        }

        await GroupsRepo.removeUserByGroupId(groupId, adminIds, 'admin');
        return null;
    }
}

export default new DeleteAdminsRouter().router;