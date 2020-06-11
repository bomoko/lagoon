// @flow

import { knex } from '../../util/db';

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

const standardProblemHarborScanMatchReturn = {
    id: 'id',
    name: 'name',
    description: 'description',
    default_lagoon_project: 'defaultLagoonProject',
    default_lagoon_environment: 'defaultLagoonEnvironment',
    default_lagoon_service_name: 'defaultLagoonServiceName',
    regex: 'regex'
};

export const Sql /* : SqlObj */ = {
  selectAllProblems: ({
    source = [],
    environmentId,
    environmentType = [],
    severity = [],
  }) => {
    let q = knex('environment_problem as p')
    .leftJoin('environment as e', 'e.id', '=', 'p.environment')
    .where('p.deleted', '=', '0000-00-00 00:00:00')
    .select('p.*', {environmentName: 'e.name'}, 'e.id', 'e.environmentType');
    if (environmentType.length > 0) {
      q.whereIn('e.environmentType', environmentType);
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
  selectProblemsByEnvironmentId: ({
    environmentId,
    severity = [],
    source = [],
  }) => {
    let q = knex('environment_problem').select(standardEnvironmentReturn)
    .where('environment', environmentId)
    .where('deleted', '=', '0000-00-00 00:00:00');
    if (severity.length > 0) {
      q.whereIn('severity', severity);
    }
    if (source.length > 0) {
      q.whereIn('source', source);
    }
    return q.toString()
  },
  insertProblem: ({environment, severity, severity_score, identifier, lagoon_service, source,
                      associated_package, description, version, fixed_version, links, data, created}) =>
    knex('environment_problem').insert({environment, severity, severity_score, identifier, lagoon_service, source,
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
  deleteProblemsFromSource: (environment, source, service) =>
      knex('environment_problem')
        .where({
          environment: environment,
          source: source,
          lagoon_service: service,
        })
        .where('deleted', '=', '0000-00-00 00:00:00')
        .update({ deleted: knex.fn.now() })
        .toString(),
  selectAllProblemHarborScanMatches: () =>
  knex('problem_harbor_scan_matcher')
  .select(standardProblemHarborScanMatchReturn).toString(),
  selectAllProblemHarborScanMatchByDatabaseId: (id) =>
  knex('problem_harbor_scan_matcher')
  .select(standardProblemHarborScanMatchReturn).
  where({ id: id }).toString(),
  insertProblemHarborScanMatch: ({
        id,
        name,
        description,
        default_lagoon_project,
        default_lagoon_environment,
        default_lagoon_service_name,
        regex
      }) =>
      knex('problem_harbor_scan_matcher').insert({
        name,
        description,
        default_lagoon_project,
        default_lagoon_environment,
        default_lagoon_service_name,
        regex
      }).toString(),
  deleteProblemHarborScanMatch: (id) =>
      knex('problem_harbor_scan_matcher')
        .where({
          id: id,
        }).delete().toString(),
};
