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

    if (!R.isEmpty(args) && (!R.isEmpty(args.source) || !R.isEmpty(args.environment) || !R.isEmpty(args.severity))) {
      rows =  await problemHelpers(sqlClient).getAllProblems(args.source, args.environment, args.severity);
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

  // Group by Problem Identifier.
  const groupByProblemId = rows.reduce(function (obj, problem) {
    obj[problem.identifier] = obj[problem.identifier] || [];
    problem.environmentId = problem.environment || '';
    obj[problem.identifier].push(problem);
    return obj;
  }, {});

  const problemIds = Object.keys(groupByProblemId).map(async (key) => {

    let projects, problems = groupByProblemId[key];
    projects = problems.map(async (problem) => {
      const envType =  !R.isEmpty(args.envType) && args.envType;
      const {id, project, openshiftProjectName, name, envName, environmentType} =
                await projectHelpers(sqlClient).getProjectByEnvironmentId(problem.environment, envType) || {};

      await hasPermission('project', 'view', {
        project: !R.isNil(project) && project,
      });

      return (!R.isNil(id)) && {id, project, openshiftProjectName, name, environments: {name: envName}, type: environmentType};
    });

    const {...problem} = R.prop(0, groupByProblemId[key]);
    return {identifier: key, problem: {...problem}, projects: await Promise.all(projects), problems: await groupByProblemId[key]};
  });

  const withProjects = await Promise.all(problemIds);
  const sorted = R.sort(R.descend(R.prop('severity')), withProjects);
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
  {},
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'view', {
    project: environment.project,
  });

  const rows = await query(
    sqlClient,
    Sql.selectProblemsByEnvironmentId(environmentId),
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
    }
  },
  { sqlClient, hasPermission },
) => {
  const environment = await environmentHelpers(sqlClient).getEnvironmentById(environmentId);

  await hasPermission('problem', 'delete', {
    project: environment.project,
  });

  await query(sqlClient, Sql.deleteProblemsFromSource(environmentId, source));

  return 'success';
};

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
