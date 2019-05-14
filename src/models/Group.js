// @flow
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Base from './Base';
import Poll from './Poll';
import Question from './Question';
import User from './User';

import type { APIGroup } from '../routers/v2/APITypes';

export type Coord = {| lat: ?number, long: ?number |}

@Entity('groups')
/**
 * Group class represents a grouping of polls.
 * @extends {Base}
 */
class Group extends Base {
  @PrimaryGeneratedColumn()
  /** Unique identifier */
  id: any = null;

  @Column('string')
  /** Name of group */
  name: string = '';

  @Column('string')
  /** Unique code to join group */
  code: string = '';

  @Column('json')
  /** Most recent coordinates of the admin of the group */
  location: Coord = { lat: null, long: null };

  @Column('boolean')
  /** If filter is activated for FR responses or live questions */
  isFilterActivated: boolean = true

  @Column('boolean')
  /** If joining a group requires user to be within 300m of the group location */
  isLocationRestricted: boolean = false

  @ManyToMany(type => User, user => user.adminGroups)
  @JoinTable()
  /** Admins of the group */
  admins: ?User[] = [];

  @OneToMany(type => Poll, poll => poll.group, {
    cascadeRemove: true,
  })
  /** Polls belonging to the group */
  polls: ?Poll[] = [];

  @OneToMany(type => Question, question => question.group, {
    cascadeRemove: true,
  })
  /** Questions belonging to the group */
  questions: ?Question[] = [];

  @ManyToMany(type => User, user => user.memberGroups)
  @JoinTable()
  /** Member of the group */
  members: ?User[] = [];

  serialize(): APIGroup {
    return {
      ...super.serialize(),
      code: this.code,
      isFilterActivated: this.isFilterActivated,
      isLive: false,
      isLocationRestricted: this.isLocationRestricted,
      location: this.location,
      name: this.name,
    };
  }
}

export default Group;
