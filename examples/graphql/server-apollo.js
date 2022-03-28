'use strict';

require('./tracer');

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const buildSchema = require('./schema');
const otel = require('@opentelemetry/api');

// Construct a schema, using GraphQL schema language
const schema = buildSchema();

const server = new ApolloServer({ schema });

const testMw = function (req, res, next) {
  otel.context.with(
    otel.propagation.setBaggage(
      otel.context.active(),
      otel.propagation.createBaggage({
        'test': { value: 'testValue' },
      })
    ),
    () => {
      console.log('attached baggage', otel.propagation.getBaggage(otel.context.active()));
      otel.context.bind(otel.context.active(), next());
    }
  );
}

const printMw = function (req, res, next) {
  console.log('printMw baggage', otel.propagation.getBaggage(otel.context.active()));
  next();
}

const app = express();
app.use(testMw);
app.use(printMw);

const gmw = server.getMiddleware({path: '/graphql'})
app.use(gmw);
app.listen(4000);

console.log('Running a GraphQL Apollo API server at http://localhost:4000/graphql');
