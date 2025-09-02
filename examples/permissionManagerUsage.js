/**
 * Example usage of PermissionManager for analyzing and handling permission errors
 */

import {
  PermissionManager,
  JASPER_PERMISSIONS,
  JASPER_ROLES,
} from '../src/utils/permissionManager.js';
import { ErrorHandler } from '../src/utils/errorHandler.js';

// Initialize managers
const permissionManager = new PermissionManager();
const errorHandler = new ErrorHandler();

console.log('=== PermissionManager Usage Examples ===\n');

// Example 1: Analyze a 401 authentication error
console.log('1. Analyzing Authentication Error:');
const authError = {
  response: {
    status: 401,
    data: {
      errorCode: 'session.expired',
      message: 'User session has expired',
    },
  },
};

const authAnalysis = permissionManager.analyzePermissionError(
  authError,
  'jasper_run_report_sync',
  'execute_report',
  { resourceUri: '/reports/sales_report' }
);

console.log('Analysis:', JSON.stringify(authAnalysis, null, 2));
console.log('\n');

// Example 2: Analyze a 403 authorization error
console.log('2. Analyzing Authorization Error:');
const permError = {
  response: {
    status: 403,
    data: {
      errorCode: 'access.denied',
      message: 'Access denied to resource',
    },
  },
};

const permAnalysis = permissionManager.analyzePermissionError(
  permError,
  'jasper_delete_resource',
  'delete_resource',
  { resourceUri: '/reports/confidential_report' }
);

console.log('Analysis:', JSON.stringify(permAnalysis, null, 2));
console.log('\n');

// Example 3: Get permission requirements for a tool
console.log('3. Getting Tool Permission Requirements:');
const requirements = permissionManager.getRequiredPermissions('jasper_create_job');
console.log('Requirements for jasper_create_job:', JSON.stringify(requirements, null, 2));
console.log('\n');

// Example 4: Check user permissions
console.log('4. Checking User Permissions:');
const userPermissions = {
  roles: [JASPER_ROLES.ROLE_REPORT_AUTHOR.name],
  permissions: [JASPER_PERMISSIONS.READ, JASPER_PERMISSIONS.WRITE, JASPER_PERMISSIONS.EXECUTE],
};

const permissionCheck = permissionManager.checkPermissions('jasper_create_job', userPermissions);
console.log('Permission Check Result:', JSON.stringify(permissionCheck, null, 2));
console.log('\n');

// Example 5: Get permission fix suggestions
console.log('5. Getting Permission Fix Suggestions:');
const suggestions = permissionManager.suggestPermissionFix(
  'jasper_create_job',
  permAnalysis,
  userPermissions
);
console.log('Suggestions:', JSON.stringify(suggestions, null, 2));
console.log('\n');

// Example 6: Enhance authentication error
console.log('6. Enhancing Authentication Error:');
const authErrorDetails = {
  errorCode: 'invalid.credentials',
  message: 'Invalid username or password',
};

const enhancement = permissionManager.enhanceAuthenticationError(authErrorDetails, 'basic');
console.log('Enhanced Error:', JSON.stringify(enhancement, null, 2));
console.log('\n');

// Example 7: Using ErrorHandler with PermissionManager integration
console.log('7. Using ErrorHandler with PermissionManager:');
const enhancedError = errorHandler.analyzePermissionError(
  permError,
  'jasper_delete_resource',
  'delete_resource',
  { resourceUri: '/reports/confidential_report' }
);

console.log('Enhanced MCP Error:', JSON.stringify(enhancedError.toJSON(), null, 2));
console.log('\n');

// Example 8: Checking permissions for different user roles
console.log('8. Permission Checks for Different Roles:');

const roles = [
  {
    name: 'Regular User',
    permissions: { roles: [JASPER_ROLES.ROLE_USER.name], permissions: [JASPER_PERMISSIONS.READ] },
  },
  {
    name: 'Report Author',
    permissions: { roles: [JASPER_ROLES.ROLE_REPORT_AUTHOR.name], permissions: [] },
  },
  {
    name: 'Administrator',
    permissions: { roles: [JASPER_ROLES.ROLE_ADMINISTRATOR.name], permissions: [] },
  },
  {
    name: 'Superuser',
    permissions: { roles: [JASPER_ROLES.ROLE_SUPERUSER.name], permissions: [] },
  },
];

const testTools = ['jasper_run_report_sync', 'jasper_delete_resource', 'jasper_create_user'];

roles.forEach(role => {
  console.log(`\n${role.name} permissions:`);
  testTools.forEach(tool => {
    const check = permissionManager.checkPermissions(tool, role.permissions);
    console.log(
      `  ${tool}: ${check.hasAccess ? '✓ ALLOWED' : '✗ DENIED'} - ${check.recommendation}`
    );
  });
});

console.log('\n=== End of Examples ===');
