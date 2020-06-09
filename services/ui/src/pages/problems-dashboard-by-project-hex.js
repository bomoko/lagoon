import React, {useEffect, useState} from 'react';
import * as R from 'ramda';
import Head from 'next/head';
import {useQuery} from "@apollo/react-hooks";
import AllProjectsProblemsQuery from 'lib/query/AllProjectsProblems';
import getSeverityEnumQuery, {getProjectOptions, getSourceOptions} from 'components/Filters/helpers';
import withQueryLoadingNoHeader from 'lib/withQueryLoadingNoHeader';
import withQueryErrorNoHeader from 'lib/withQueryErrorNoHeader';
import ProblemsByProject from "components/ProblemsByProject";
import Accordion from "components/Accordion";
import Honeycomb from "components/Honeycomb";
import MainLayout from 'layouts/MainLayout';
import SelectFilter from 'components/Filters';
import { bp } from 'lib/variables';

const EnvType = Object.freeze({
    PRODUCTION:   'PRODUCTION',
    DEVELOPMENT:  'DEVELOPMENT'
});

/**
 * Displays the problems overview page by project.
 */
const ProblemsDashboardProductHexPage = () => {
  const [projectSelect, setProjectSelect] = useState([]);
  const [source, setSource] = useState([]);
  const [severity, setSeverity] = useState(['CRITICAL']);
  const [envType, setEnvType] = useState('PRODUCTION');

  const { data: projects, loading: projectsLoading } = useQuery(getProjectOptions);
  const { data: severities, loading: severityLoading } = useQuery(getSeverityEnumQuery);
  const { data: sources, loading: sourceLoading } = useQuery(getSourceOptions);

  const { data: projectsProblems, loading: projectsProblemsLoading} = useQuery(AllProjectsProblemsQuery);

  const handleProjectChange = (project) => {
    let values = project && project.map(p => p.value) || [];
    setProjectSelect(values);
  };

  const handleEnvTypeChange = (envType) => {
    setEnvType(envType.value);
  };

  const handleSourceChange = (source) => {
    let values = source && source.map(s => s.value) || [];
    setSource(values);
  };

  const handleSeverityChange = (severity) => {
    let values = severity && severity.map(s => s.value) || [];
    setSeverity(values);
  };

  const projectOptions = (projects) => {
    return projects && projects.map(p => ({ value: p.name, label: p.name}));
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
      <title>Problems Dashboard By Project</title>
    </Head>
    <MainLayout>
      <div className="filters-wrapper">
        <div className="filters">
          <SelectFilter
              title="Project"
              loading={projectsLoading}
              options={projects && projectOptions(projects.allProjects)}
              onFilterChange={handleProjectChange}
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
        <div className="filters">
          <SelectFilter
            title="Source"
            loading={sourceLoading}
            options={sources && sourceOptions(sources.sources)}
            onFilterChange={handleSourceChange}
            isMulti
          />
          <SelectFilter
            title="EnvType"
            defaultValue={{value: 'PRODUCTION', label: 'Production'}}
            options={[
              {value: 'PRODUCTION', label: 'Production'},
              {value: 'DEVELOPMENT', label: 'Development'}
            ]}
            onFilterChange={handleEnvTypeChange}
          />
        </div>
      </div>
      <div className="content-wrapper">
        <div className="overview">
          <Honeycomb data={!R.isNil(projectsProblems) && projectsProblems}/>
        </div>
      </div>
      <style jsx>{`
        .filters-wrapper, .project-filter {
          margin: 32px calc((100vw / 16) * 1);
          @media ${bp.wideUp} {
            margin: 32px calc((100vw / 16) * 2);
          }
          @media ${bp.extraWideUp} {
            margin: 32px calc((100vw / 16) * 3);
          }
          .filters {
            display: flex;
            justify-content: space-between;

            &:first-child {
              padding-bottom: 1em;
            }
          }
        }
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
            background: #fff;
            margin: 0 calc((100vw / 16) * 1);
            @media ${bp.wideUp} {
              margin: 0 calc((100vw / 16) * 2);
            }
            @media ${bp.extraWideUp} {
              margin: 0 calc((100vw / 16) * 3);
            }
            li.result {
              display: inline;
            }
          }
          .environment-wrapper {
            padding: 0 1em 1em;
            background: #fefefe;
            margin: 0 0 2em;

            h4 {
              font-weight: 500;
            }
          }
          .data-none {
            display: flex;
            justify-content: space-between;
            padding: 1em;
            border: 1px solid #efefef;
          }
        }
      `}</style>
    </MainLayout>
  </>);
};

export default ProblemsDashboardProductHexPage;
