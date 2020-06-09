import React, {useState, Fragment, useEffect, useRef} from "react";
import { HexGrid, Layout, Hexagon, Text, GridGenerator, HexUtils } from 'react-hexgrid';
import * as R from 'ramda';
import ProblemsByProject from "components/ProblemsByProject";
import {LoadingPageNoHeader} from 'pages/_loading';
import {ErrorNoHeader} from 'pages/_error';
import { bp } from 'lib/variables';
import './styling.css';

const config = {
    "width": 1200,
    "height": 300,
    "layout": {"width": 11, "height": 11, "flat": false, "spacing": 1.08},
    "origin": {"x": 0, "y": 0},
    "map": "rectangle",
};

const Honeycomb = ({ data, children }) => {
    const { projectsProblems } = data || [];
    const [projects, setProjects] = useState(projects);
    // const [problemsProject, setProblemsProject] = useState([]);
    const [projectInView, setProjectInView] = useState(false);

    const generator = GridGenerator.getGenerator(config.map);
    let rows = projectsProblems && parseInt(projectsProblems.length / 15);

    const hexs = generator.apply(config, [15, ++rows]);
    const layout = config.layout;
    const size = { x: layout.width, y: layout.height };

    const handleHexClick = (project) => {
        const {environments, id, name} = project || [];
        const problems = environments && environments.filter(e => e instanceof Object).map(e => {
            return e.problems;
        });

        const problemsPerProject = Array.prototype.concat.apply([], problems);
        const critical = problemsPerProject.filter(p => p.severity === 'CRITICAL').length;
        const high = problemsPerProject.filter(p => p.severity === 'HIGH').length;
        const medium = problemsPerProject.filter(p => p.severity === 'MEDIUM').length;
        const low = problemsPerProject.filter(p => p.severity === 'LOW').length;

        setProjectInView({name: name, environments: environments, severityCount: {critical: critical, high: high, medium: medium, low: low}});
    };

    const getClassName = (critical) => {
        if (critical === 0) { return "normal" }
        if (critical === 1) { return "light-red" } else
        if (critical >= 1 && critical <= 5) { return "red" } else
        if (critical >= 5 && critical < 10) { return "dark-red" } else
        if (critical >= 10 && critical < 15) { return "darker-red" }
    };

    useEffect(() => {
        setProjects(projectsProblems);
    }, [projectsProblems]);

    return (
      <div className="honeycomb-display">
        {!projects && <LoadingPageNoHeader />}
        {projects &&
          <div className="content-wrapper">
            <div className="content">
              <label>Projects: {projects.length}</label>
            </div>
          </div>
        }
        {projects &&
        <>
          <HexGrid width={config.width} height={config.height} viewBox={'95 -30 100 100'}>
            <Layout size={size} flat={layout.flat} spacing={layout.spacing} origin={config.origin}>
              {hexs.slice(0, projects.length).map((hex, i) => {
              //const criticalClass = criticalCount && criticalCount >=1 ? "red" : "green";

                const project = projects[i] || [];
                const {environments, id, name} = project;
                const filterProblems = environments && environments.filter(e => e instanceof Object).map(e => {
                  return e.problems;
                });

                const problemsPerProject = Array.prototype.concat.apply([], filterProblems);
                const critical = problemsPerProject.filter(p => p.severity === 'CRITICAL').length;

                return (
                  <Hexagon key={i} q={hex.q} r={hex.r} s={hex.s} className={getClassName(critical)} onClick={() => handleHexClick(project)}>
                    {problemsPerProject.length ?
                        <Text>
                            P: {problemsPerProject.length}, C: {critical}
                        </Text>
                      : <Text>P: {problemsPerProject.length}</Text>}
                  </Hexagon>
                )})}
            </Layout>
          </HexGrid>
          <div className="project-details">
            <div className="content-wrapper">
              <div className="content">
                {projectInView ?
                  <>
                    <div className="project"><label>Project: {projectInView.name}</label></div>
                    {projectInView.environments && projectInView.environments.map(environment => (
                      <div className="environment-wrapper">
                        <label className="environment"><h5>Environment: {environment.name}</h5></label>
                        <ProblemsByProject key={environment.id} problems={environment.problems || [] } minified={true}/>
                      </div>
                    ))}
                  </>
                : <div className="project">No project selected</div>
                }
              </div>
            </div>
          </div>
        </>
        }
        <style jsx>{`
          .content-wrapper {
            .content {
              background: #fff;
              margin: 0 calc((100vw / 16) * 1) 20px;
              @media ${bp.wideUp} {
                margin: 0 calc((100vw / 16) * 2) 20px;
              }
              @media ${bp.extraWideUp} {
                margin: 0 calc((100vw / 16) * 3) 20px;
              }
              li.result {
                display: inline;
              }
              .project {
                padding: 20px;
              }
              .environment {
                h5 {
                  padding: 10px 20px;
                  margin-top: 0;
                  background: #f3f3f3;
                }
              }
            }
            .loading {
              margin: 2em calc(100vw / 2) 0;
            }
          }
        `}</style>
      </div>
    );
};

export default Honeycomb;