// @flow

import * as R from 'ramda';
import { sendToLagoonLogs } from '@lagoon/commons/src/logs';
import { createMiscTask } from '@lagoon/commons/src/tasks';
import { knex, query, isPatchEmpty, prepare } from '../../util/db';
import { Helpers as environmentHelpers } from '../environment/helpers';
import { Sql } from './sql';
const problemHelpers = require('./helpers');
import { Helpers as projectHelpers } from '../project/helpers';
const logger = require('../../logger');

/* ::

import type {ResolversObj} from '../';

*/

export const getAllProblems = async (
  root,
  args,
  {
    sqlClient,
    hasPermission,
    keycloakGrant,
  }
) => {
  let rows = [];

  try {
    await hasPermission('problem', 'viewAll');

    if (!R.isEmpty(args)) {
      rows = await problemHelpers(sqlClient).getAllProblems(args.source, args.environment, args.envType, args.severity);
    }
    else {
      rows = await query(sqlClient, Sql.selectAllProblems({source: [], environmentId: ''}));
    }
  }
  catch (err) {
    console.log(err);
    if (!keycloakGrant) {
      logger.warn('No grant available for getAllProblems');
      return [];
    }
  }

  const problemsById = await problemHelpers(sqlClient).groupByProblemIdentifier(rows);
  const problemsWithProjects = await problemHelpers(sqlClient).getProblemsWithProjects(problemsById, hasPermission, args);

  const sorted = R.sort(R.descend(R.prop('severity')), problemsWithProjects);
  return sorted.map(row => ({ ...row }));
};

export const getSeverityOptions = async (
  root,
  args,
  { sqlClient, hasPermission },
) => {
  await hasPermission('problem', 'viewAll');
  return await problemHelpers(sqlClient).getSeverityOptions();
};

export const getProblemSources = async (
  root,
  args,
  { sqlClient, hasPermission },
) => {
  await hasPermission('problem', 'viewAll');

  const preparedQuery = prepare(
    sqlClient,
    `SELECT DISTINCT source FROM environment_problem`,
  );

  return R.map(
    R.prop('source'),
      await query(sqlClient, preparedQuery(args))
    );
};

export const getProblemsByEnvironmentId = async (
  { id: environmentId },
  {severity, source},
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'view', {
    project: environment.project,
  });

  const rows = await query(
    sqlClient,
    Sql.selectProblemsByEnvironmentId({
      environmentId,
      severity,
      source,
    }),
  );

  return  R.sort(R.descend(R.prop('created')), rows);
};

export const addProblem = async (
  root,
  {
    input: {
      id, severity, environment: environmentId, identifier, service, source, data, created,
        severityScore, associatedPackage, description, version, fixedVersion, links
    },
  },
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'add', {
    project: environment.project,
  });

  const {
    info: { insertId },
  } = await query(
    sqlClient,
    Sql.insertProblem({
      severity,
      severity_score: severityScore,
      lagoon_service: service,
      identifier,
      environment: environmentId,
      source,
      associated_package: associatedPackage,
      description,
      version,
      fixed_version: fixedVersion,
      links: links,
      data,
      created,
    }),
  );

  const rows = await query(sqlClient, Sql.selectProblemByDatabaseId(insertId));
  return R.prop(0, rows);
};

/**
 * Essentially this is a bulk insert
 */
export const addProblemsFromSource = async(
  root,
  {
    input: {
      environment: environmentId,
      source,
      problems,
    }
  },
  { sqlClient, hasPermission }
  ) => {
    const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

    await hasPermission('problem', 'add', {
      project: environment.project,
    });

    //NOTE: this actually works - let's move it into a transaction ...
     const Promises = problems.map(element => query(
        sqlClient,
        Sql.insertProblem({
            severity: element.severity,
            severity_score: element.severityScore,
            lagoon_service: element.service,
            identifier: element.identifier,
            environment: element.environmentId,
            source: element.source,
            associated_package: element.associatedPackage,
            description: element.description,
            version: element.version,
            fixed_version: element.fixedVersion,
            links: element.links,
            data: element.data,
            created: element.element,
        })
      ));

      let rets = [];
      //TODO: use Rambda to pull these props off - build some kind of fallback logic for errors ...
      // await Promise.all(Promises).then(values => rets = values.map(e => e.info.insertId));
      // return rets;
};

export const deleteProblem = async (
  root,
  {
    input : {
      environment: environmentId,
      identifier,
    }
  },
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'delete', {
    project: environment.project,
  });

  await query(sqlClient, Sql.deleteProblem(environmentId, identifier));

  return 'success';
};

export const deleteProblemsFromSource = async (
  root,
  {
    input : {
      environment: environmentId,
      source,
      service,
    }
  },
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'delete', {
    project: environment.project,
  });

  await query(sqlClient, Sql.deleteProblemsFromSource(environmentId, source, service));

  return 'success';
}

export const getProblemHarborScanMatches = async (
  root,
  args,
  { sqlClient, hasPermission },
) => {

  await hasPermission('harbor_scan_match', 'view', {});

  const rows = await query(
    sqlClient,
    Sql.selectAllProblemHarborScanMatches(),
  );

  return rows;
};

export const addProblemHarborScanMatch = async (
  root,
  {
    input: {
      name,
      description,
      defaultLagoonProject,
      defaultLagoonEnvironment,
      defaultLagoonServiceName,
      regex
    },
  },
  { sqlClient, hasPermission },
) => {

  await hasPermission('harbor_scan_match', 'add', {});

  const {
    info: { insertId },
  } = await query(
    sqlClient,
    Sql.insertProblemHarborScanMatch(
      {
        id: null,
        name,
        description,
        default_lagoon_project: defaultLagoonProject,
        default_lagoon_environment: defaultLagoonEnvironment,
        default_lagoon_service_name: defaultLagoonServiceName,
        regex
      }
    ),
  );

  const rows = await query(sqlClient, Sql.selectAllProblemHarborScanMatchByDatabaseId(insertId));
  return R.prop(0, rows);
};


export const deleteProblemHarborScanMatch = async (
  root,
  {
    input : {
      id
    }
  },
  { sqlClient, hasPermission },
) => {

  await hasPermission('harbor_scan_match', 'delete', {});

  await query(sqlClient, Sql.deleteProblemHarborScanMatch(id));

  return 'success';
};
