#!/usr/bin/env node
/**
 * Deployment Script for Report Functions
 * Deploys all report functions to Appwrite
 */

const { Client, Functions } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const ReportConfig = require('../config/report-config');

class ReportDeployer {
  constructor() {
    this.client = new Client();
    this.functions = null;
    this.config = ReportConfig;
    
    this.initializeClient();
  }

  initializeClient() {
    const dbConfig = this.config.getDatabaseConfig();
    
    this.client
      .setEndpoint(dbConfig.endpoint)
      .setProject(dbConfig.projectId)
      .setKey(dbConfig.apiKey);

    this.functions = new Functions(this.client);
  }

  /**
   * Create deployment package
   */
  async createDeploymentPackage(functionPath) {
    return new Promise((resolve, reject) => {
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const zipPath = path.join(tempDir, `deployment_${Date.now()}.tar.gz`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: 9 }
      });

      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(functionPath, false);
      archive.finalize();
    });
  }

  /**
   * Deploy a single function
   */
  async deployFunction(functionName, functionConfig) {
    console.log(`Deploying ${functionName}...`);
    
    try {
      // Check if function exists
      let functionId;
      try {
        const existingFunction = await this.functions.get(functionName);
        functionId = existingFunction.$id;
        console.log(`Function ${functionName} exists, updating...`);
      } catch (error) {
        if (error.code === 404) {
          // Create new function
          const newFunction = await this.functions.create(
            functionName,
            functionConfig.name,
            functionConfig.runtime,
            functionConfig.entrypoint,
            [],
            functionConfig.timeout,
            functionConfig.memory,
            functionConfig.variables
          );
          functionId = newFunction.$id;
          console.log(`Created new function ${functionName}`);
        } else {
          throw error;
        }
      }

      // Create deployment package
      const packagePath = await this.createDeploymentPackage(functionConfig.path);
      
      // Create deployment
      const deployment = await this.functions.createDeployment(
        functionId,
        packagePath,
        true
      );

      console.log(`Deployment created for ${functionName}: ${deployment.$id}`);
      
      // Clean up
      fs.unlinkSync(packagePath);
      
      return {
        success: true,
        functionId,
        deploymentId: deployment.$id
      };
    } catch (error) {
      console.error(`Failed to deploy ${functionName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deploy all report functions
   */
  async deployAll() {
    console.log('Starting deployment of all report functions...');
    
    const functionConfigs = this.config.getAllFunctionConfigs();
    const results = [];
    
    for (const [functionName, config] of Object.entries(functionConfigs)) {
      const result = await this.deployFunction(functionName, config);
      results.push({
        functionName,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Deploy specific functions
   */
  async deploySpecific(functionNames) {
    console.log(`Deploying specific functions: ${functionNames.join(', ')}`);
    
    const functionConfigs = this.config.getAllFunctionConfigs();
    const results = [];
    
    for (const functionName of functionNames) {
      const config = functionConfigs[functionName];
      if (!config) {
        results.push({
          functionName,
          success: false,
          error: 'Function configuration not found'
        });
        continue;
      }
      
      const result = await this.deployFunction(functionName, config);
      results.push({
        functionName,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Update function configuration
   */
  async updateFunctionConfig(functionName, updates) {
    try {
      const functionConfig = this.config.getFunctionConfig(functionName);
      if (!functionConfig) {
        throw new Error(`Function ${functionName} not found in configuration`);
      }

      await this.functions.update(
        functionName,
        functionConfig.name,
        functionConfig.runtime,
        functionConfig.entrypoint,
        [],
        updates.timeout || functionConfig.timeout,
        updates.memory || functionConfig.memory,
        { ...functionConfig.variables, ...updates.variables }
      );

      console.log(`Updated configuration for ${functionName}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to update ${functionName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all deployed functions
   */
  async listDeployedFunctions() {
    try {
      const response = await this.functions.list();
      return response.functions.filter(func => 
        Object.keys(this.config.getAllFunctionConfigs()).includes(func.$id)
      );
    } catch (error) {
      console.error('Failed to list functions:', error.message);
      return [];
    }
  }

  /**
   * Health check for deployed functions
   */
  async healthCheck(functionName) {
    try {
      const func = await this.functions.get(functionName);
      
      return {
        functionName,
        status: func.status,
        deployment: func.deployment,
        updatedAt: func.updatedAt,
        createdAt: func.createdAt
      };
    } catch (error) {
      return {
        functionName,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(functionName, deploymentId) {
    try {
      await this.functions.updateDeployment(functionName, deploymentId);
      console.log(`Rolled back ${functionName} to deployment ${deploymentId}`);
      return { success: true };
    } catch (error) {
      console.error(`Failed to rollback ${functionName}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const deployer = new ReportDeployer();

  try {
    switch (command) {
      case 'deploy-all':
        const allResults = await deployer.deployAll();
        console.log('\nDeployment Results:');
        allResults.forEach(result => {
          console.log(`${result.functionName}: ${result.success ? '✓' : '✗'} ${result.error || ''}`);
        });
        break;

      case 'deploy':
        const functionNames = args.slice(1);
        if (functionNames.length === 0) {
          console.error('Please specify function names to deploy');
          process.exit(1);
        }
        const specificResults = await deployer.deploySpecific(functionNames);
        console.log('\nDeployment Results:');
        specificResults.forEach(result => {
          console.log(`${result.functionName}: ${result.success ? '✓' : '✗'} ${result.error || ''}`);
        });
        break;

      case 'list':
        const functions = await deployer.listDeployedFunctions();
        console.log('\nDeployed Report Functions:');
        functions.forEach(func => {
          console.log(`${func.$id}: ${func.name} (${func.status})`);
        });
        break;

      case 'health':
        const functionName = args[1];
        if (!functionName) {
          console.error('Please specify function name for health check');
          process.exit(1);
        }
        const health = await deployer.healthCheck(functionName);
        console.log('\nHealth Check Result:', health);
        break;

      case 'update':
        const updateFunction = args[1];
        if (!updateFunction) {
          console.error('Please specify function name to update');
          process.exit(1);
        }
        const updates = JSON.parse(args[2] || '{}');
        const updateResult = await deployer.updateFunctionConfig(updateFunction, updates);
        console.log('Update Result:', updateResult);
        break;

      default:
        console.log(`
Usage:
  node deploy-reports.js deploy-all                    Deploy all report functions
  node deploy-reports.js deploy func1 func2          Deploy specific functions
  node deploy-reports.js list                        List deployed functions
  node deploy-reports.js health function-name        Check function health
  node deploy-reports.js update function-name '{"timeout": 300}'  Update function config
        `);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ReportDeployer;