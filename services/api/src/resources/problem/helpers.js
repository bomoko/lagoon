// @flow

/* ::
import type MariaSQL from 'mariasql';
*/

const R = require('ramda');
const { asyncPipe } = require('@lagoon/commons/src/util');
const { prepare, query } = require('../../util/db');
const projectHelpers = require('../project/helpers');
const Sql = require('./sql');

const Helpers = (sqlClient /* : MariaSQL */) => {
    const groupByProblemIdentifier = (problems) => problems.reduce((obj, problem) => {
        obj[problem.identifier] = obj[problem.identifier] || [];
        obj[problem.identifier].push(problem);
        return obj;
    }, {});

    const getAllProblems = async (source, environment, envType, severity) => {
      const environmentType = envType.map(t => t.toLowerCase());

      const problems = await query(
        sqlClient,
        Sql.selectAllProblems({
          source,
          environmentId: environment,
          environmentType,
          severity,
        })
      );

      return problems;
    };

    const getSeverityOptions = async () => (
      R.map(
        R.prop('severity'),
          await query(sqlClient, Sql.selectSeverityOptions()),
        )
    );

    const getProblemsWithProjects = async (problems, hasPermission, args = []) => {
        const withProjects = await Object.keys(problems).map((key) => {
            let projects = problems[key].map((problem) => {
                const envType =  !R.isEmpty(args.envType) && args.envType;
                const {id, project, openshiftProjectName, name, envName, environmentType} =
                    projectHelpers(sqlClient).getProjectByEnvironmentId(problem.environment, envType) || {};

                 hasPermission('project', 'view', {
                    project: !R.isNil(project) && project,
                });

                return (!R.isNil(id)) && {id, project, openshiftProjectName, name, environments: {name: envName}, type: environmentType};
            });

            const {...problem} = R.prop(0, problems[key]);
            return {identifier: key, problem: {...problem}, projects: projects, problems: problems[key]};
        });

        return await Promise.all(withProjects);
    };

    return {
      getAllProblems,
      getSeverityOptions,
      groupByProblemIdentifier,
      getProblemsWithProjects
    };
};

module.exports = Helpers;
