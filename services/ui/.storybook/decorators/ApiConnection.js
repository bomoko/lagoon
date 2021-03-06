import React from 'react';
import { action } from '@storybook/addon-actions';
import { AuthContext } from 'lib/Authenticator';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import { SchemaLink } from 'apollo-link-schema';
import { ApolloProvider } from 'react-apollo';
import { makeExecutableSchema, addMockFunctionsToSchema } from 'graphql-tools';
import typeDefs from 'api/dist/typeDefs';
import mocks, { seed } from 'api/src/mocks';

import introspectionQueryResultData from 'api/src/fragmentTypes.json';

const fragmentMatcher = new IntrospectionFragmentMatcher({
  introspectionQueryResultData
});

// Make a GraphQL schema without resolvers.
const schema = makeExecutableSchema({ typeDefs });

// Add mocks, modifies schema in place.
addMockFunctionsToSchema({ schema, mocks });

// Create a mocked Apollo client for the ApolloProvider.
const client = new ApolloClient({
  cache: new InMemoryCache({fragmentMatcher}),
  link: new SchemaLink({ schema })
});

// Mock the src/lib/Authenticator and lib/withLocalAuth.
const auth = {
  apiToken: 'dummy-value-not-used-but-evals-to-true',
  authenticated: true,
  logout: action('logout'),
  provider: 'local-auth',
  providerData: {},
  user: {
    username: 'admin',
  },
};

export default storyFn => {
  // Generate consistent results by seeding the mocks generator before each
  // story.
  seed();
  return (
    <AuthContext.Provider value={auth}>
      <ApolloProvider client={client}>
        {storyFn()}
      </ApolloProvider>
    </AuthContext.Provider>
  );
};
