import gql from "graphql-tag";

export const getSourceOptions = gql`
  query getProblemSources {
    sources: problemSources
  }
`;

const getSeverityEnumQuery = gql`
  query severityEnum {
    __type(name: "ProblemSeverityRating") {
      name
      enumValues {
        name
      }
    }
  }
`;

export default getSeverityEnumQuery;
