// @flow

/* ::
import type MariaSQL from 'mariasql';
*/

const R = require('ramda');
const { asyncPipe } = require('@lagoon/commons/src/util');
const { prepare, query } = require('../../util/db');

const Sql = require('./sql');

const Helpers = (sqlClient /* : MariaSQL */) => {
    const getAllProblems = async (source, environment, severity) => {
      const problems = await query(
        sqlClient,
        Sql.selectAllProblems({
          source,
          environmentId: environment,
          severity,
        })
      );

      if (!problems) {
        throw new Error('Unauthorized');
      }

      return problems;
    };

    const getSeverityOptions = async () => (
      R.map(
        R.prop('severity'),
          await query(sqlClient, Sql.selectSeverityOptions()),
        )
    );

    return {
      getAllProblems,
      getSeverityOptions
    };
};

module.exports = Helpers;
