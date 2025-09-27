#!/usr/bin/env node

require('dotenv').config();
const { Client, Databases } = require('node-appwrite');
const chalk = require('chalk');
const ora = require('ora');

class CollectionCreator {
  constructor() {
    this.client = new Client();
    this.databases = new Databases(this.client);
    
    // Configure Appwrite client
    this.client
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_PROJECT_ID || '68a6e04b002d20c10020')
      .setKey(process.env.APPWRITE_API_KEY);

    this.databaseId = process.env.APPWRITE_DATABASE_ID || '68beb588001a9f2d71dc';
  }

  async createCollection(collectionId, name, attributes) {
    const spinner = ora(`Creating ${name} collection...`).start();
    
    try {
      // Check if collection already exists
      try {
        await this.databases.getCollection(this.databaseId, collectionId);
        spinner.succeed(`${name} collection already exists`);
        return;
      } catch (error) {
        // Collection doesn't exist, create it
      }

      // Create collection
      await this.databases.createCollection(
        this.databaseId,
        collectionId,
        name,
        undefined, // permissions - will be set later
        true // documentSecurity
      );

      // Add attributes
      for (const attr of attributes) {
        await this.createAttribute(collectionId, attr);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for attribute to be ready
      }

      spinner.succeed(`${name} collection created successfully`);
    } catch (error) {
      spinner.fail(`Failed to create ${name} collection: ${error.message}`);
      throw error;
    }
  }

  async createAttribute(collectionId, attr) {
    try {
      switch (attr.type) {
        case 'string':
          await this.databases.createStringAttribute(
            this.databaseId,
            collectionId,
            attr.key,
            attr.size,
            attr.required,
            attr.default,
            attr.array || false
          );
          break;
        case 'integer':
          await this.databases.createIntegerAttribute(
            this.databaseId,
            collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array || false
          );
          break;
        case 'float':
          await this.databases.createFloatAttribute(
            this.databaseId,
            collectionId,
            attr.key,
            attr.required,
            attr.min,
            attr.max,
            attr.default,
            attr.array || false
          );
          break;
        case 'boolean':
          await this.databases.createBooleanAttribute(
            this.databaseId,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array || false
          );
          break;
        case 'datetime':
          await this.databases.createDatetimeAttribute(
            this.databaseId,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
            attr.array || false
          );
          break;
      }
    } catch (error) {
      console.log(chalk.yellow(`Warning: Could not create attribute ${attr.key}: ${error.message}`));
    }
  }

  async createCollections() {
    console.log(chalk.cyan('🚀 Creating Missing Collections\n'));

    // Employee Profiles Collection
    await this.createCollection('employee_profiles', 'Employee Profiles', [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'employee_id', type: 'string', size: 50, required: true },
      { key: 'employee_type', type: 'string', size: 50, required: true },
      { key: 'professional_title', type: 'string', size: 100, required: true },
      { key: 'license_number', type: 'string', size: 50, required: false },
      { key: 'license_expiry_date', type: 'datetime', required: false },
      { key: 'specializations', type: 'string', size: 1000, required: false, array: true },
      { key: 'primary_facility_id', type: 'string', size: 255, required: true },
      { key: 'assigned_facilities', type: 'string', size: 255, required: false, array: true },
      { key: 'department', type: 'string', size: 100, required: false },
      { key: 'employment_status', type: 'string', size: 50, required: true },
      { key: 'hire_date', type: 'datetime', required: false },
      { key: 'contact_information', type: 'string', size: 2000, required: false },
      { key: 'work_schedule', type: 'string', size: 1000, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ]);

    // Patient Profiles Collection
    await this.createCollection('patient_profiles', 'Patient Profiles', [
      { key: 'user_id', type: 'string', size: 255, required: true },
      { key: 'patient_id', type: 'string', size: 50, required: false },
      { key: 'profile_status', type: 'string', size: 50, required: true },
      { key: 'verification_status', type: 'string', size: 50, required: true },
      { key: 'verification_method', type: 'string', size: 50, required: false },
      { key: 'access_permissions', type: 'string', size: 100, required: false, array: true },
      { key: 'notification_preferences', type: 'string', size: 2000, required: false },
      { key: 'emergency_contact', type: 'string', size: 1000, required: false },
      { key: 'facility_id', type: 'string', size: 255, required: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ]);

    // Patients Collection (if not exists)
    await this.createCollection('patients', 'Patients', [
      { key: 'patient_id', type: 'string', size: 50, required: true },
      { key: 'first_name', type: 'string', size: 100, required: true },
      { key: 'last_name', type: 'string', size: 100, required: true },
      { key: 'date_of_birth', type: 'datetime', required: true },
      { key: 'gender', type: 'string', size: 20, required: true },
      { key: 'contact_phone', type: 'string', size: 20, required: false },
      { key: 'contact_email', type: 'string', size: 255, required: false },
      { key: 'address', type: 'string', size: 500, required: false },
      { key: 'guardian_name', type: 'string', size: 200, required: false },
      { key: 'guardian_phone', type: 'string', size: 20, required: false },
      { key: 'facility_id', type: 'string', size: 255, required: true },
      { key: 'profile_id', type: 'string', size: 255, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ]);

    // Immunization Records Collection (if not exists)
    await this.createCollection('immunization_records', 'Immunization Records', [
      { key: 'patient_id', type: 'string', size: 255, required: true },
      { key: 'vaccine_id', type: 'string', size: 255, required: true },
      { key: 'facility_id', type: 'string', size: 255, required: true },
      { key: 'administered_by', type: 'string', size: 255, required: true },
      { key: 'administration_date', type: 'datetime', required: true },
      { key: 'batch_number', type: 'string', size: 100, required: false },
      { key: 'expiry_date', type: 'datetime', required: false },
      { key: 'site_of_administration', type: 'string', size: 100, required: false },
      { key: 'dose_number', type: 'integer', required: false },
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'adverse_reactions', type: 'string', size: 1000, required: false },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true }
    ]);

    console.log(chalk.green('\n🎉 All collections created successfully!'));
    console.log(chalk.cyan('\n➡️  Next: Run the users seeder (01-users-only-seeder.js)'));
  }
}

// Run if called directly
if (require.main === module) {
  const creator = new CollectionCreator();
  creator.createCollections().catch(console.error);
}

module.exports = CollectionCreator;