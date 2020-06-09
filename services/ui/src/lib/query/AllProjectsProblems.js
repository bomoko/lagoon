import gql from 'graphql-tag';
import ProblemsFragment from 'lib/fragment/Problem';

export default gql`
  query getAllProjectsProblemsQuery($severity: [ProblemSeverityRating]) {
    projectsProblems: allProjects {
      id
      name
      environments {
        id
        name
        problems(severity: $severity) {
          ...problemFields
        }
      }
    }
  }
  ${ProblemsFragment}
`;