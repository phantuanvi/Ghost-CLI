'use strict';
const expect = require('chai').expect;
const proxyquire = require('proxyquire').noPreserveCache();
const sinon = require('sinon');
const path = require('path');

const errors = require('../../../lib/errors');
const modulePath = '../../../lib/utils/version-from-zip';

describe('Unit: Utils > versionFromZip', function () {
    it('rejects if zip file doesn\'t exist', function () {
        const existsStub = sinon.stub().returns(false);
        const versionFromZip = proxyquire(modulePath, {
            fs: {existsSync: existsStub}
        });

        return versionFromZip('/some/zip/file.zip').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file could not be found.');
            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.calledWithExactly('/some/zip/file.zip')).to.be.true;
        });
    });

    it('rejects if zip file doesn\'t have a .zip extension', function () {
        const existsStub = sinon.stub().returns(true);
        const versionFromZip = proxyquire(modulePath, {
            fs: {existsSync: existsStub}
        });

        return versionFromZip('./some/non/zip/file.txt').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file could not be found.');
            expect(existsStub.calledOnce).to.be.true;
            expect(existsStub.calledWithExactly(path.join(process.cwd(), './some/non/zip/file.txt'))).to.be.true;
        });
    });

    it('rejects if zip does not have a valid package.json', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/nopkg.zip')).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file does not contain a valid package.json.');
        });
    });

    it('rejects if package.json in zip is not for ghost', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/notghost.zip')).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file does not contain a Ghost release.');
        });
    });

    it('rejects if ghost version in zip is < 1.0', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/ghostlts.zip')).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file contains pre-1.0 version of Ghost.');
        });
    });

    it('rejects if node version isn\'t compatible with ghost node version range and GHOST_NODE_VERSION_CHECK isn\'t set', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-node.zip')).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file contains a Ghost version incompatible with the current Node version.');
        });
    });

    it('resolves if node version isn\'t compatible with ghost node version range and GHOST_NODE_VERSION_CHECK is set', function () {
        const versionFromZip = require(modulePath);

        process.env.GHOST_NODE_VERSION_CHECK = 'false';

        return versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-node.zip')).then((version) => {
            delete process.env.GHOST_NODE_VERSION_CHECK;
            expect(version).to.equal('1.0.0');
        }).catch((error) => {
            delete process.env.GHOST_NODE_VERSION_CHECK;
            return Promise.reject(error);
        });
    });

    it('rejects if a CLI version is specified in package.json and is not compatible with the current CLI version', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/ghost-invalid-cli.zip')).then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message).to.equal('Zip file contains a Ghost version incompatible with this version of the CLI.');
        });
    });

    it('rejects if update version passed and zip version < update version', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/ghostold.zip'), '1.5.0').then(() => {
            expect(false, 'error should have been thrown').to.be.true;
        }).catch((error) => {
            expect(error).to.be.an.instanceof(errors.SystemError);
            expect(error.message)
                .to.equal('Zip file contains an older release version than what is currently installed.');
        });
    });

    it('resolves with version of ghost in zip file', function () {
        const versionFromZip = require(modulePath);

        return versionFromZip(path.join(__dirname, '../../fixtures/ghostrelease.zip')).then((version) => {
            expect(version).to.equal('1.5.0');
        });
    });
});
