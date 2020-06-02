import React from 'react';
import * as R from 'ramda';
import Head from 'next/head';
import { Query } from 'react-apollo';
import {useQuery} from "@apollo/react-hooks";
import AllProblemsQuery from 'lib/query/AllProblems';
import getSeverityEnumQuery, {getSourceOptions} from 'components/Filters/helpers';
import withQueryLoadingNoHeader from 'lib/withQueryLoadingNoHeader';
import withQueryErrorNoHeader from 'lib/withQueryErrorNoHeader';
import ProblemsByIdentifier from "components/ProblemsByIdentifier";
import MainLayout from 'layouts/MainLayout';
import SelectFilter from 'components/Filters';
import { bp } from 'lib/variables';

/**
 * Displays the problems overview page.
 */
const ProblemsDashboardPage = () => {
  const [source, setSource] = React.useState([]);
  const [severity, setSeverity] = React.useState(['CRITICAL']);

  const { data: severities, loading: severityLoading } = useQuery(getSeverityEnumQuery);
  const { data: sources, loading: sourceLoading } = useQuery(getSourceOptions);

  const handleSourceChange = (source) => {
    let values = source && source.map(s => s.value) || [];
    setSource(values);
  };

  const handleSeverityChange = (severity) => {
    let values = severity && severity.map(s => s.value) || [];
    setSeverity(values);
  };

  const sourceOptions = (sources) => {
      return sources && sources.map(s => ({ value: s, label: s}));
  };

  const severityOptions = (enums) => {
    return enums && enums.map(s => ({ value: s.name, label: s.name}));
  };

  return (
  <>
    <Head>
      <title>Problems Dashboard</title>
    </Head>
    <MainLayout>
      <div className="filters-wrapper">
        <h2>Problems Dashboard</h2>
        <div className="filters">
            <SelectFilter
              title="Source"
              loading={sourceLoading}
              options={sources && sourceOptions(sources.sources)}
              onFilterChange={handleSourceChange}
              isMulti
            />
            <SelectFilter
              title="Severity"
              loading={severityLoading}
              options={severities && severityOptions(severities.__type.enumValues)}
              defaultValue={{value: "CRITICAL", label: "CRITICAL"}}
              onFilterChange={handleSeverityChange}
              isMulti
            />
        </div>
        <style jsx>{`
            .filters-wrapper {
              margin: 38px calc((100vw / 16) * 1);
              @media ${bp.wideUp} {
                margin: 38px calc((100vw / 16) * 2);
              }
              @media ${bp.extraWideUp} {
                margin: 38px calc((100vw / 16) * 3);
              }
              .filters {
                display: flex;
                justify-content: space-between;
              }
            }
          `}</style>
      </div>
      <Query
        query={AllProblemsQuery}
        variables={{
            source: source,
            severity: severity
        }}
        displayName="AllProblemsQuery"
      >
        {R.compose(
            withQueryLoadingNoHeader,
            withQueryErrorNoHeader
        )(({data: { problems }}) => {
          const critical = problems.filter(p => p.problem.severity === 'CRITICAL').length;
          const high = problems.filter(p => p.problem.severity === 'HIGH').length;
          const medium = problems.filter(p => p.problem.severity === 'MEDIUM').length;
          const low = problems.filter(p => p.problem.severity === 'LOW').length;

          return (
          <>
            <div className="content-wrapper">
              <div className="content">
                <div className="overview">
                  <ul className="overview-list">
                    <li className="result"><label>Results: </label>{Object.keys(problems).length} Problems</li>
                    <li className="result"><label>Critical: </label>{critical}</li>
                    <li className="result"><label>High: </label>{high}</li>
                    <li className="result"><label>Medium: </label>{medium}</li>
                    <li className="result"><label>Low: </label>{low}</li>
                  </ul>
                </div>
                <ProblemsByIdentifier problems={problems || []}/>
              </div>
              <style jsx>{`
                .content-wrapper {
                  h2 {
                    margin: 38px calc((100vw / 16) * 1) 0;
                    @media ${bp.wideUp} {
                      margin: 62px calc((100vw / 16) * 2) 0;
                    }
                    @media ${bp.extraWideUp} {
                      margin: 62px calc((100vw / 16) * 3) 0;
                    }
                  }
                  .content {
                    margin: 38px calc((100vw / 16) * 1);
                    @media ${bp.wideUp} {
                      margin: 38px calc((100vw / 16) * 2);
                    }
                    @media ${bp.extraWideUp} {
                      margin: 38px calc((100vw / 16) * 3);
                    }

                    li.result {
                      display: inline;
                    }
                  }
                }
              `}</style>
            </div>
          </>);
        })}
      </Query>
    </MainLayout>
  </>);
};

export default ProblemsDashboardPage;
