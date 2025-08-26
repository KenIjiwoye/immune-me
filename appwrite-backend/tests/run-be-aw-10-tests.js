#!/usr/bin/env node

/**
 * BE-AW-10 Test Runner
 * 
 * Comprehensive test runner for the enhanced permission system.
 * Provides various test execution modes and detailed reporting.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class TestRunner {
    constructor() {
        this.testResults = {
            unit: null,
            integration: null,
            validation: null,
            performance: null,
            coverage: null
        };
        this.startTime = Date.now();
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    logHeader(message) {
        this.log('\n' + '='.repeat(60), 'cyan');
        this.log(message, 'bright');
        this.log('='.repeat(60), 'cyan');
    }

    logSuccess(message) {
        this.log(`✓ ${message}`, 'green');
    }

    logError(message) {
        this.log(`✗ ${message}`, 'red');
    }

    logWarning(message) {
        this.log(`⚠ ${message}`, 'yellow');
    }

    logInfo(message) {
        this.log(`ℹ ${message}`, 'blue');
    }

    async runCommand(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: 'inherit',
                cwd: __dirname,
                ...options
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`Command failed with exit code ${code}`));
                }
            });

            child.on('error', (error) => {
                reject(error);
            });
        });
    }

    async runTestSuite(suiteName, testPattern, description) {
        this.logHeader(`Running ${suiteName} Tests`);
        this.logInfo(description);

        try {
            const startTime = Date.now();
            
            await this.runCommand('npx', [
                'jest',
                '--testPathPattern=' + testPattern,
                '--verbose',
                '--colors',
                '--detectOpenHandles',
                '--forceExit'
            ]);

            const duration = Date.now() - startTime;
            this.testResults[suiteName.toLowerCase()] = { success: true, duration };
            this.logSuccess(`${suiteName} tests completed in ${duration}ms`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults[suiteName.toLowerCase()] = { success: false, duration, error: error.message };
            this.logError(`${suiteName} tests failed: ${error.message}`);
            throw error;
        }
    }

    async runCoverageReport() {
        this.logHeader('Generating Coverage Report');
        
        try {
            const startTime = Date.now();
            
            await this.runCommand('npx', [
                'jest',
                '--coverage',
                '--coverageReporters=text',
                '--coverageReporters=html',
                '--coverageReporters=lcov',
                '--coverageDirectory=coverage',
                '--detectOpenHandles',
                '--forceExit'
            ]);

            const duration = Date.now() - startTime;
            this.testResults.coverage = { success: true, duration };
            this.logSuccess(`Coverage report generated in ${duration}ms`);
            this.logInfo('HTML coverage report: coverage/lcov-report/index.html');
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.testResults.coverage = { success: false, duration, error: error.message };
            this.logError(`Coverage report failed: ${error.message}`);
            throw error;
        }
    }

    async validateCoverageThresholds() {
        this.logHeader('Validating Coverage Thresholds');
        
        try {
            await this.runCommand('npx', [
                'jest',
                '--coverage',
                '--coverageThreshold={"global":{"branches":80,"functions":80,"lines":80,"statements":80}}',
                '--passWithNoTests',
                '--silent'
            ]);

            this.logSuccess('Coverage thresholds met');
            
        } catch (error) {
            this.logError('Coverage thresholds not met');
            throw error;
        }
    }

    async runLinting() {
        this.logHeader('Running Test Linting');
        
        try {
            await this.runCommand('npx', [
                'eslint',
                '**/*.test.js',
                '**/*.spec.js',
                '--fix'
            ]);

            this.logSuccess('Test linting completed');
            
        } catch (error) {
            this.logWarning('Test linting found issues (non-blocking)');
        }
    }

    async checkTestEnvironment() {
        this.logHeader('Checking Test Environment');
        
        // Check if required files exist
        const requiredFiles = [
            'jest.config.js',
            'setup.js',
            'package.json',
            '../config/permissions.json',
            '../config/collection-permissions.json',
            '../config/security-rules.json'
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                this.logSuccess(`Found: ${file}`);
            } else {
                this.logError(`Missing: ${file}`);
                throw new Error(`Required file missing: ${file}`);
            }
        }

        // Check Node.js version
        const nodeVersion = process.version;
        this.logInfo(`Node.js version: ${nodeVersion}`);
        
        // Check if we're in test environment
        if (process.env.NODE_ENV !== 'test') {
            process.env.NODE_ENV = 'test';
            this.logWarning('Set NODE_ENV to test');
        }

        this.logSuccess('Test environment validated');
    }

    generateSummaryReport() {
        this.logHeader('Test Execution Summary');
        
        const totalDuration = Date.now() - this.startTime;
        const totalTests = Object.keys(this.testResults).length;
        const passedTests = Object.values(this.testResults).filter(r => r && r.success).length;
        const failedTests = totalTests - passedTests;

        this.logInfo(`Total execution time: ${totalDuration}ms`);
        this.logInfo(`Test suites: ${totalTests}`);
        
        if (passedTests > 0) {
            this.logSuccess(`Passed: ${passedTests}`);
        }
        
        if (failedTests > 0) {
            this.logError(`Failed: ${failedTests}`);
        }

        // Detailed results
        this.log('\nDetailed Results:', 'bright');
        for (const [suite, result] of Object.entries(this.testResults)) {
            if (result) {
                const status = result.success ? '✓' : '✗';
                const color = result.success ? 'green' : 'red';
                const duration = result.duration ? ` (${result.duration}ms)` : '';
                this.log(`  ${status} ${suite}${duration}`, color);
                
                if (!result.success && result.error) {
                    this.log(`    Error: ${result.error}`, 'red');
                }
            }
        }

        return failedTests === 0;
    }

    async runAll() {
        try {
            await this.checkTestEnvironment();
            await this.runLinting();
            
            // Run test suites in order
            await this.runTestSuite(
                'Unit',
                'permissions/be-aw-10-collection-permissions.test.js',
                'Testing individual permission system components'
            );

            await this.runTestSuite(
                'Integration',
                'integration/existing-utilities-integration.test.js',
                'Testing integration with existing utilities and backward compatibility'
            );

            await this.runTestSuite(
                'Validation',
                'validation/be-aw-10-acceptance-criteria.test.js',
                'Validating implementation against acceptance criteria'
            );

            await this.runTestSuite(
                'Performance',
                'performance/permission-performance.test.js',
                'Testing performance characteristics and benchmarks'
            );

            await this.runCoverageReport();
            await this.validateCoverageThresholds();

            const success = this.generateSummaryReport();
            
            if (success) {
                this.logSuccess('\nAll tests passed! 🎉');
                process.exit(0);
            } else {
                this.logError('\nSome tests failed! 😞');
                process.exit(1);
            }
            
        } catch (error) {
            this.logError(`\nTest execution failed: ${error.message}`);
            this.generateSummaryReport();
            process.exit(1);
        }
    }

    async runSpecific(testType) {
        try {
            await this.checkTestEnvironment();
            
            switch (testType.toLowerCase()) {
                case 'unit':
                    await this.runTestSuite(
                        'Unit',
                        'permissions/be-aw-10-collection-permissions.test.js',
                        'Testing individual permission system components'
                    );
                    break;
                    
                case 'integration':
                    await this.runTestSuite(
                        'Integration',
                        'integration/existing-utilities-integration.test.js',
                        'Testing integration with existing utilities'
                    );
                    break;
                    
                case 'validation':
                    await this.runTestSuite(
                        'Validation',
                        'validation/be-aw-10-acceptance-criteria.test.js',
                        'Validating acceptance criteria'
                    );
                    break;
                    
                case 'performance':
                    await this.runTestSuite(
                        'Performance',
                        'performance/permission-performance.test.js',
                        'Testing performance benchmarks'
                    );
                    break;
                    
                case 'coverage':
                    await this.runCoverageReport();
                    await this.validateCoverageThresholds();
                    break;
                    
                default:
                    throw new Error(`Unknown test type: ${testType}`);
            }
            
            const success = this.generateSummaryReport();
            process.exit(success ? 0 : 1);
            
        } catch (error) {
            this.logError(`Test execution failed: ${error.message}`);
            process.exit(1);
        }
    }

    async runWatch() {
        this.logHeader('Running Tests in Watch Mode');
        this.logInfo('Tests will re-run when files change. Press Ctrl+C to exit.');
        
        try {
            await this.runCommand('npx', [
                'jest',
                '--watch',
                '--verbose',
                '--colors'
            ]);
        } catch (error) {
            this.logError(`Watch mode failed: ${error.message}`);
            process.exit(1);
        }
    }

    async runCI() {
        this.logHeader('Running Tests in CI Mode');
        
        try {
            await this.checkTestEnvironment();
            
            await this.runCommand('npx', [
                'jest',
                '--ci',
                '--coverage',
                '--watchAll=false',
                '--verbose',
                '--colors',
                '--detectOpenHandles',
                '--forceExit'
            ]);

            await this.validateCoverageThresholds();
            
            this.logSuccess('CI tests completed successfully');
            process.exit(0);
            
        } catch (error) {
            this.logError(`CI tests failed: ${error.message}`);
            process.exit(1);
        }
    }

    showHelp() {
        this.log('\nBE-AW-10 Test Runner', 'bright');
        this.log('Usage: node run-be-aw-10-tests.js [command]', 'cyan');
        this.log('\nCommands:', 'bright');
        this.log('  all         Run all test suites (default)', 'green');
        this.log('  unit        Run unit tests only', 'green');
        this.log('  integration Run integration tests only', 'green');
        this.log('  validation  Run acceptance criteria validation only', 'green');
        this.log('  performance Run performance tests only', 'green');
        this.log('  coverage    Generate coverage report only', 'green');
        this.log('  watch       Run tests in watch mode', 'green');
        this.log('  ci          Run tests in CI mode', 'green');
        this.log('  help        Show this help message', 'green');
        this.log('\nExamples:', 'bright');
        this.log('  node run-be-aw-10-tests.js', 'yellow');
        this.log('  node run-be-aw-10-tests.js unit', 'yellow');
        this.log('  node run-be-aw-10-tests.js watch', 'yellow');
        this.log('  npm run test:be-aw-10', 'yellow');
        this.log('  npm run test:be-aw-10:unit', 'yellow');
    }
}

// Main execution
async function main() {
    const runner = new TestRunner();
    const command = process.argv[2] || 'all';

    switch (command.toLowerCase()) {
        case 'all':
            await runner.runAll();
            break;
        case 'unit':
        case 'integration':
        case 'validation':
        case 'performance':
        case 'coverage':
            await runner.runSpecific(command);
            break;
        case 'watch':
            await runner.runWatch();
            break;
        case 'ci':
            await runner.runCI();
            break;
        case 'help':
        case '--help':
        case '-h':
            runner.showHelp();
            break;
        default:
            runner.logError(`Unknown command: ${command}`);
            runner.showHelp();
            process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main().catch((error) => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = TestRunner;