// @flow

import {useQuery} from "@apollo/react-hooks";
import moment from "moment";

const R = require('ramda');
const { sendToLagoonLogs } = require('@lagoon/commons/src/logs');
const { createMiscTask } = require('@lagoon/commons/src/tasks');
const problemHelpers = require('../problem/helpers');
const environmentHelpers = require('../environment/helpers');
const projectHelpers = require('../project/helpers');
const Sql = require('./sql');
const logger = require('../../logger');

const {
    knex,
    inClause,
    prepare,
    query,
    whereAnd,
    isPatchEmpty,
} = require('../../util/db');

/* ::

import type {ResolversObj} from '../';

*/

const getAllProblems = async (
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
      rows = await query(sqlClient, Sql.selectAllProblems({source: []}));
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

const getSeverityOptions = async (
  root,
  args,
  { sqlClient, hasPermission },
) => {
  await hasPermission('problem', 'viewAll');
  return await problemHelpers(sqlClient).getSeverityOptions();
};

const getProblemSources = async (
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

const getProblemsByEnvironmentId = async (
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

const addProblem = async (
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
      id,
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
const addProblemsFromSource = async(
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
          identifier: element.identifier,
          environment: environmentId,
          source,
          data: element.data,
        })
      ));

      let rets = [];
      //TODO: use Rambda to pull these props off - build some kind of fallback logic for errors ...
      await Promise.all(Promises).then(values => rets = values.map(e => e.info.insertId));
      // return rets;
};

const deleteProblem = async (
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

const deleteProblemsFromSource = async (
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

const Resolvers /* : ResolversObj */ = {
  getAllProblems,
  getSeverityOptions,
  getProblemSources,
  getProblemsByEnvironmentId,
  addProblem,
  deleteProblem,
  deleteProblemsFromSource,
  addProblemsFromSource,
};

module.exports = Resolvers;
