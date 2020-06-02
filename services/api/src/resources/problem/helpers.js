// @flow

/* ::
import type MariaSQL from 'mariasql';
*/

const R = require('ramda');
const { asyncPipe } = require('@lagoon/commons/src/util');
const { prepare, query } = require('../../util/db');

const Sql = require('./sql');

const Helpers = (sqlClient /* : MariaSQL */) => {
    const getSeverityOptions = async () => (
      R.map(
        R.prop('severity'),
          await query(sqlClient, Sql.selectSeverityOptions()),
        )
    );

    return {
      getSeverityOptions
    };
};

module.exports = Helpers;
