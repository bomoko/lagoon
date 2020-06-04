// @flow

const { knex } = require('../../util/db');

/* ::

import type {SqlObj} from '../';

*/

const standardEnvironmentReturn = {
    id: 'id',
    environment: 'environment',
    severity: 'severity',
    severityScore: 'severity_score',
    identifier: 'identifier',
    service: 'lagoon_service',
    source: 'source',
    associatedPackage: 'associated_package',
    description: 'description',
    version: 'version',
    fixedVersion: 'fixed_version',
    links: 'links',
    data: 'data',
    created: 'created',
    deleted: 'deleted'
};

const Sql /* : SqlObj */ = {
  selectAllProblems: ({
    source = [],
    environmentId,
    environmentType = [],
    severity = [],
  }) => {
    let q = knex('environment_problem as p')
    .leftJoin('environment as e', 'e.id', '=', 'p.environment')
    .where('p.deleted', '=', '0000-00-00 00:00:00')
    .select('p.*', {environmentName: 'e.name'}, 'e.environmentType');
    if (environmentType.length > 0) {
      q.where('p.environmentType', environmentType);
    }
    if (source.length > 0) {
      q.whereIn('p.source', source);
    }
    if (environmentId) {
      q.where('p.environment', environmentId);
    }
    if (severity.length > 0) {
      q.whereIn('p.severity', severity);
    }
    return q.toString();
  },
  selectSeverityOptions: () =>
    knex('environment_problem')
      .select('severity')
      .toString(),
  selectProblemByDatabaseId: (id) =>
    knex('environment_problem').where('id', id).toString(),
  selectProblemsByEnvironmentId: (environmentId) =>
    knex('environment_problem').select(standardEnvironmentReturn)
    .where('environment', environmentId)
    .where('deleted', '=', '0000-00-00 00:00:00')
    .toString(),
  insertProblem: ({id, environment, severity, severity_score, identifier, lagoon_service, source,
                      associated_package, description, version, fixed_version, links, data, created}) =>
    knex('environment_problem').insert({id, environment, severity, severity_score, identifier, lagoon_service, source,
        associated_package, description, version, fixed_version, links, data, created}).toString(),
  deleteProblem: (environment, identifier) =>
    knex('environment_problem')
      .where({
        environment: environment,
        identifier: identifier
      })
      .where('deleted', '=', '0000-00-00 00:00:00')
      .update({ deleted: knex.fn.now() })
      .toString(),
  deleteProblemsFromSource: (environment, source) =>
      knex('environment_problem')
        .where({
          environment: environment,
          source: source
        })
        .where('deleted', '=', '0000-00-00 00:00:00')
        .update({ deleted: knex.fn.now() })
        .toString(),
};

module.exports = Sql;
