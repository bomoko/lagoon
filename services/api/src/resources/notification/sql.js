// @flow

const { knex } = require('../../util/db');
const DEFAULTS = require('./defaults');

/* ::

import type {Cred, SqlObj} from '../';

*/

const Sql /* : SqlObj */ = {
  createProjectNotification: (input /* : Object */) => {
    const { pid, notificationType, nid, contentType = DEFAULTS.NOTIFICATION_CONTENT_TYPE } = input;

    return knex('project_notification')
      .insert({
        pid,
        type: notificationType,
        nid,
        content_type: contentType,
      })
      .toString();
  },
  selectProjectNotificationByNotificationName: (input /* : Object */) => {
    const { name, type, contentType = DEFAULTS.NOTIFICATION_CONTENT_TYPE } = input;

    return knex('project_notification AS pn')
      .joinRaw(
        `JOIN notification_${type} AS nt ON pn.nid = nt.id AND pn.type = :type and pn.content_type = :content_type`,
        {type: type, content_type: contentType},
      )
      .where('nt.name', '=', name)
      .select('nt.*', 'pn.*', knex.raw('? as type', [type]))
      .toString();
  },
  deleteProjectNotification: (input /* : Object */) => {
    const deleteQuery = knex.raw(
      `DELETE pn
      FROM project_notification as pn
      LEFT JOIN :notificationTable: AS nt ON pn.nid = nt.id AND pn.type = :notificationType
      LEFT JOIN project as p on pn.pid = p.id
      WHERE p.name = :project
      AND nt.name = :notificationName`,
      {
        ...input,
        notificationTable: `notification_${input.notificationType}`,
      },
    );

    return deleteQuery.toString();
  },
  selectProjectById: (input /* : Object */) =>
    knex('project')
      .select('*')
      .where({
        'project.id': input,
      })
      .toString(),
  selectProjectByName: (input /* : Object */) => {
    const { project } = input;

    return knex('project')
      .select('*')
      .where({
        'project.name': project,
      })
      .toString();
  },
  selectProjectNotification: (input /* : Object */) => {
    const { project, notificationType, notificationName, contentType = DEFAULTS.NOTIFICATION_CONTENT_TYPE } = input;
    return knex({ p: 'project', nt: `notification_${notificationType}` })
      .where({ 'p.name': project })
      .andWhere({ 'nt.name': notificationName })
      .select({ pid: 'p.id', nid: 'nt.id' })
      .toString();
  },
  updateNotificationMicrosoftTeams: (input /* : Object */) => {
    const { name, patch } = input;

    return knex('notification_microsoftteams')
      .where('name', '=', name)
      .update(patch)
      .toString();
  },
  updateNotificationRocketChat: (input /* : Object */) => {
    const { name, patch } = input;

    return knex('notification_rocketchat')
      .where('name', '=', name)
      .update(patch)
      .toString();
  },
  updateNotificationEmail: (input /* : Object */) => {
    const { name, patch } = input;

    return knex('notification_email')
      .where('name', '=', name)
      .update(patch)
      .toString();
  },
  updateNotificationSlack: (input /* : Object */) => {
    const { name, patch } = input;

    return knex('notification_email')
      .where('name', '=', name)
      .update(patch)
      .toString();
  },
  selectNotificationsByTypeByProjectId: (input /* : Object */) => {
    const { type, pid, contentType = DEFAULTS.NOTIFICATION_CONTENT_TYPE } = input;
    const selectQuery = knex('project_notification AS pn').joinRaw(
      `JOIN notification_${type} AS nt ON pn.nid = nt.id AND pn.type = :type AND pn.content_type = :contentType`,
      {type, contentType},
    );

    return selectQuery
      .where('pn.pid', '=', pid)
      .select('nt.*', 'pn.type')
      .toString();
  },
  selectNotificationMicrosoftTeamsByName:  (name /* : string */) =>
    knex('notification_microsoftteams')
      .where('name', '=', name)
      .toString(),
  selectNotificationRocketChatByName: (name /* : string */) =>
    knex('notification_rocketchat')
      .where('name', '=', name)
      .toString(),
  selectNotificationSlackByName: (name /* : string */) =>
    knex('notification_slack')
      .where('name', '=', name)
      .toString(),
  selectNotificationEmailByName: (name /* : string */) =>
    knex('notification_email')
      .where('name', '=', name)
      .toString(),
  selectUnassignedNotificationsByType: (notificationType /* : string */) =>
    knex(`notification_${notificationType} AS nt`)
      .leftJoin(
        knex.raw(
          'project_notification AS pn ON pn.nid = nt.id AND pn.type = ?',
          [notificationType],
        ),
      )
      .whereRaw('pn.nid IS NULL and pn.pid IS NULL')
      .select('nt.*', knex.raw('? as type', [notificationType]))
      .toString(),
  selectProjectNotificationsWithoutAccess: (
    { permissions: { projects } } /* : Cred */,
    { nids } /* : { nids: Array<number> } */,
  ) =>
    knex('project_notification AS pn')
      .join('project AS p', 'pn.pid', '=', 'p.id')
      .whereIn('pn.nid', nids)
      .whereNotIn('pn.pid', projects)
      .select('pn.*')
      .toString(),
  truncateNotificationSlack: () =>
    knex('notification_slack')
      .truncate()
      .toString(),
  truncateNotificationEmail: () =>
    knex('notification_email')
      .truncate()
      .toString(),
  truncateNotificationRocketchat: () =>
    knex('notification_rocketchat')
      .truncate()
      .toString(),
  truncateNotificationMicrosoftTeams: () =>
    knex('notification_microsoftteams')
      .truncate()
      .toString(),
  truncateProjectNotification: () =>
    knex('project_notification')
      .truncate()
      .toString(),
};

module.exports = Sql;
