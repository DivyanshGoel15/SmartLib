const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  resolveMigrationConfig,
  connectMigrationDatabase
} = require('../scripts/migratePlaintextPasswords');

describe('Plaintext password migration database safety', () => {
  test('requires an explicitly configured production database URI', () => {
    assert.throws(
      () => resolveMigrationConfig({ NODE_ENV: 'production' }, ['--confirm-smartlib-write']),
      /MONGODB_URI or MONGO_URI must be explicitly configured/
    );
  });

  test('rejects invalid and mismatched production database URIs', () => {
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'https://db.example.test/smartlib'
      }, ['--confirm-smartlib-write']),
      /valid MongoDB connection URI/
    );
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/other'
      }, ['--confirm-smartlib-write']),
      /must explicitly target the smartlib database/
    );
  });

  test('test mode requires TEST_MONGODB_URI and never uses a production URI', () => {
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib'
      }, ['--confirm-smartlib-write']),
      /TEST_MONGODB_URI must be explicitly configured/
    );
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'test',
        TEST_MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib'
      }),
      /must target the isolated smartlib_test database/
    );
    assert.deepEqual(
      resolveMigrationConfig({
        NODE_ENV: 'test',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib',
        TEST_MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib_test'
      }),
      {
        uri: 'mongodb://127.0.0.1:27017/smartlib_test',
        dbName: 'smartlib_test'
      }
    );
  });

  test('refuses production writes without the explicit confirmation flag', () => {
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib'
      }),
      /without --confirm-smartlib-write/
    );
    assert.deepEqual(
      resolveMigrationConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib'
      }, ['--confirm-smartlib-write']),
      {
        uri: 'mongodb://127.0.0.1:27017/smartlib',
        dbName: 'smartlib'
      }
    );
  });

  test('rejects conflicting production URI variables rather than choosing one', () => {
    assert.throws(
      () => resolveMigrationConfig({
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/smartlib',
        MONGO_URI: 'mongodb://127.0.0.1:27017/other'
      }, ['--confirm-smartlib-write']),
      /MONGODB_URI and MONGO_URI disagree/
    );
  });

  test('connects with the validated URI even if the environment URI later changes', async () => {
    const validatedConfig = resolveMigrationConfig({
      NODE_ENV: 'test',
      TEST_MONGODB_URI: 'mongodb://validated-host/smartlib_test'
    });
    const previousNodeEnv = process.env.NODE_ENV;
    const previousTestUri = process.env.TEST_MONGODB_URI;
    const originalConnect = mongoose.connect;
    let connectionArguments;

    try {
      process.env.NODE_ENV = 'test';
      process.env.TEST_MONGODB_URI = 'mongodb://conflicting-host/smartlib_test';
      mongoose.connect = async (...args) => {
        connectionArguments = args;
        return { connection: {} };
      };

      await connectMigrationDatabase(validatedConfig);

      assert.equal(connectionArguments[0], validatedConfig.uri);
      assert.equal(connectionArguments[1].dbName, validatedConfig.dbName);
    } finally {
      mongoose.connect = originalConnect;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousTestUri === undefined) delete process.env.TEST_MONGODB_URI;
      else process.env.TEST_MONGODB_URI = previousTestUri;
    }
  });
});
