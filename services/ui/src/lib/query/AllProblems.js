import gql from 'graphql-tag';
import ProblemsFragment from 'lib/fragment/Problem';

export default gql`
  query getAllProblemsQuery($source: [String], $project: Int, $environment: Int, $envType: EnvType, $identifier: String, $severity: [ProblemSeverityRating]) {
    problems: allProblems(source: $source , project: $project, environment: $environment, identifier: $identifier, envType: $envType, severity: $severity) {
        identifier
        problem {
          ...problemFields
        }
        projects {
          id
          name
          environments(type: $envType) {
            id
            name
          }
          openshiftProjectName
        }
        problems {
          ...problemFields
        }
    }
  }
  ${ProblemsFragment}
`;
