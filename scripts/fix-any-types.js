const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

// Common type replacements
const TYPE_REPLACEMENTS = {
  // Function parameters
  'function calculateEstimate(jobDetails: any, pricingRules: any[])': 'function calculateEstimate(jobDetails: JobDetails, pricingRules: PricingRule[])',
  'function evaluateCondition(jobDetails: any, condition: any)': 'function evaluateCondition(jobDetails: JobDetails, condition: PricingRule)',
  'async function generateAIQuote(jobDetails: any, estimate: any, pricingRules: any[])': 'async function generateAIQuote(jobDetails: JobDetails, estimate: Estimate, pricingRules: PricingRule[])',
  'async function scoreLead(lead: any)': 'async function scoreLead(lead: Lead)',
  'async function sendAutomatedSMS(leadId: string, contactInfo: any)': 'async function sendAutomatedSMS(leadId: string, contactInfo: ContactInfo)',
  'async function addToCRM(leadId: string, contactInfo: any)': 'async function addToCRM(leadId: string, contactInfo: ContactInfo)',
  'async function createFollowUpTask(leadId: string, contactInfo: any)': 'async function createFollowUpTask(leadId: string, contactInfo: ContactInfo)',
  'async function scheduleAutomatedCall(leadId: string, contactInfo: any)': 'async function scheduleAutomatedCall(leadId: string, contactInfo: ContactInfo)',
  'function generateEmailContent(contactInfo: any)': 'function generateEmailContent(contactInfo: ContactInfo)',
  'function generatePersonalizedEmailContent(contactInfo: any)': 'function generatePersonalizedEmailContent(contactInfo: ContactInfo)',
  'function generateSMSContent(contactInfo: any)': 'function generateSMSContent(contactInfo: ContactInfo)',
  'async function logContactActivity(leadId: string, activityType: string, details: any)': 'async function logContactActivity(leadId: string, activityType: string, details: ContactActivity)',
  'function generateReminderMessage(appointment: any, business: any, reminderType: string)': 'function generateReminderMessage(appointment: Appointment, business: Business, reminderType: string)',
  'async function generateAgentPrompt(business: any, settings: any, agent: any)': 'async function generateAgentPrompt(business: Business, settings: AISettings, agent: AIAgent)',
  'async function testAgentConfiguration(settings: any, businessName: string)': 'async function testAgentConfiguration(settings: AISettings, businessName: string)',
  'function generateWorkingPrompt(business: any, settings: any, currentAgent: any)': 'function generateWorkingPrompt(business: Business, settings: AISettings, currentAgent: AIAgent)',
  'async function testWorkingConfiguration(settings: any, businessName: string)': 'async function testWorkingConfiguration(settings: AISettings, businessName: string)',
  
  // Variable declarations
  'const breakdown: any[]': 'const breakdown: EstimateBreakdown[]',
  'const sanitized: any = {}': 'const sanitized: Record<string, unknown> = {}',
  'private onUpdateCallback: ((data: any) => void) | null': 'private onUpdateCallback: ((data: WebSocketMessage) => void) | null',
  'onUpdate: (data: any) => void': 'onUpdate: (data: WebSocketMessage) => void',
  'send(data: any)': 'send(data: WebSocketMessage)',
  'export function sendToSession(sessionId: string, message: any)': 'export function sendToSession(sessionId: string, message: WebSocketMessage)',
  'export function storeSession(sessionId: string, controller: any, encoder: any)': 'export function storeSession(sessionId: string, controller: ReadableStreamDefaultController, encoder: TextEncoder)',
  'query: () => Promise<{ data: T | null; error: any }>': 'query: () => Promise<{ data: T | null; error: DatabaseError | null }>',
  'inputValidation?: (input: any) => boolean': 'inputValidation?: (input: unknown) => boolean',
  'export function validateBusinessId(businessId: any)': 'export function validateBusinessId(businessId: unknown)',
  'export function validateUserId(userId: any)': 'export function validateUserId(userId: unknown)',
  'export function validateEmail(email: any)': 'export function validateEmail(email: unknown)',
  'export function validatePhoneNumber(phone: any)': 'export function validatePhoneNumber(phone: unknown)',
  'static generateRevenueOptimizedPrompt(config: any)': 'static generateRevenueOptimizedPrompt(config: RevenueOptimizedConfig)',
  'static generateIndustrySpecificPrompt(businessType: string, config: any)': 'static generateIndustrySpecificPrompt(businessType: string, config: RevenueOptimizedConfig)',
  'static generatePricingScripts(): any': 'static generatePricingScripts(): PricingScripts',
  'static generateObjectionHandling(): any': 'static generateObjectionHandling(): ObjectionHandling',
  'static generateClosingTechniques(): any': 'static generateClosingTechniques(): ClosingTechniques',
  'private async storeAgentInfo(businessId: string, agentId: string, agentData: any)': 'private async storeAgentInfo(businessId: string, agentId: string, agentData: AgentData)',
  'export async function phoneNumberExists(phone: string, supabaseAdmin: any)': 'export async function phoneNumberExists(phone: string, supabaseAdmin: SupabaseClient)',
  'linkedin_profiles?: any[]': 'linkedin_profiles?: LinkedInProfile[]',
  
  // Generic any replacements
  ': any': ': unknown',
  '<any>': '<unknown>',
  'any[]': 'unknown[]',
  'Record<string, any>': 'Record<string, unknown>',
  'Array<any>': 'Array<unknown>',
  'Promise<any>': 'Promise<unknown>',
  'Function<any>': 'Function<unknown>',
  'Map<string, any>': 'Map<string, unknown>',
  'Set<any>': 'Set<unknown>',
  'WeakMap<any, any>': 'WeakMap<unknown, unknown>',
  'WeakSet<any>': 'WeakSet<unknown>',
  'Partial<any>': 'Partial<unknown>',
  'Required<any>': 'Required<unknown>',
  'Pick<any, any>': 'Pick<unknown, string>',
  'Omit<any, any>': 'Omit<unknown, string>',
  'Exclude<any, any>': 'Exclude<unknown, unknown>',
  'Extract<any, any>': 'Extract<unknown, unknown>',
  'NonNullable<any>': 'NonNullable<unknown>',
  'ReturnType<any>': 'ReturnType<Function>',
  'Parameters<any>': 'Parameters<Function>',
  'ConstructorParameters<any>': 'ConstructorParameters<Function>',
  'InstanceType<any>': 'InstanceType<Function>',
  'ThisParameterType<any>': 'ThisParameterType<Function>',
  'OmitThisParameter<any>': 'OmitThisParameter<Function>',
  'ThisType<any>': 'ThisType<unknown>',
  'Uppercase<any>': 'Uppercase<string>',
  'Lowercase<any>': 'Lowercase<string>',
  'Capitalize<any>': 'Capitalize<string>',
  'Uncapitalize<any>': 'Uncapitalize<string>',
};

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /coverage/,
  /test/,
  /tests/,
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  /scripts/,
  /migrations/,
  /docs/,
  /lib\/types\/common\.ts$/, // Don't process the types file itself
];

function shouldExcludeFile(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

function fixAnyTypes(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesMade = false;

  // Add import for common types if needed
  const needsTypeImport = content.includes(': JobDetails') || 
                         content.includes(': PricingRule') || 
                         content.includes(': Estimate') || 
                         content.includes(': Lead') || 
                         content.includes(': ContactInfo') || 
                         content.includes(': Appointment') || 
                         content.includes(': Business') || 
                         content.includes(': AISettings') || 
                         content.includes(': AIAgent') || 
                         content.includes(': WebSocketMessage') || 
                         content.includes(': SessionData') || 
                         content.includes(': ValidationResult') || 
                         content.includes(': QueryResult') || 
                         content.includes(': RevenueOptimizedConfig') || 
                         content.includes(': PricingScripts') || 
                         content.includes(': ObjectionHandling') || 
                         content.includes(': ClosingTechniques') || 
                         content.includes(': AgentData') || 
                         content.includes(': PhoneValidationResult') || 
                         content.includes(': LeadScoringResult') || 
                         content.includes(': ContactActivity') || 
                         content.includes(': ReminderMessage') || 
                         content.includes(': TestResult') || 
                         content.includes(': WorkingPromptConfig') || 
                         content.includes(': AgentConfiguration') || 
                         content.includes(': ValidationFunction') || 
                         content.includes(': ErrorDetails') || 
                         content.includes(': APIError') || 
                         content.includes(': APISuccess') || 
                         content.includes(': APIResponse') || 
                         content.includes(': PaginationParams') || 
                         content.includes(': PaginatedResponse') || 
                         content.includes(': FilterParams') || 
                         content.includes(': SortParams') || 
                         content.includes(': QueryParams') || 
                         content.includes(': DatabaseError') || 
                         content.includes(': SupabaseResponse') || 
                         content.includes(': RateLimitConfig') || 
                         content.includes(': SecurityHeaders') || 
                         content.includes(': LogEntry') || 
                         content.includes(': HealthCheckResult') || 
                         content.includes(': ServiceHealth') || 
                         content.includes(': MonitoringAlert') || 
                         content.includes(': PerformanceMetrics') || 
                         content.includes(': BusinessMetrics') || 
                         content.includes(': CallMetrics') || 
                         content.includes(': LeadMetrics') || 
                         content.includes(': RevenueMetrics') || 
                         content.includes(': DashboardData') || 
                         content.includes(': ExportOptions') || 
                         content.includes(': ImportResult') || 
                         content.includes(': BackupConfig') || 
                         content.includes(': MigrationResult') || 
                         content.includes(': FeatureFlag') || 
                         content.includes(': A\/BTest') || 
                         content.includes(': ComplianceConfig') || 
                         content.includes(': AuditLog') || 
                         content.includes(': SystemConfig');

  if (needsTypeImport && !content.includes('from \'@/lib/types/common\'')) {
    // Find the last import statement
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].startsWith('import ') || importLines[i].startsWith('import{')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, 'import type { JobDetails, PricingRule, Estimate, Lead, ContactInfo, Appointment, Business, AISettings, AIAgent, WebSocketMessage, SessionData, ValidationResult, QueryResult, RevenueOptimizedConfig, PricingScripts, ObjectionHandling, ClosingTechniques, AgentData, PhoneValidationResult, LeadScoringResult, ContactActivity, ReminderMessage, TestResult, WorkingPromptConfig, AgentConfiguration, ValidationFunction, ErrorDetails, APIError, APISuccess, APIResponse, PaginationParams, PaginatedResponse, FilterParams, SortParams, QueryParams, DatabaseError, SupabaseResponse, RateLimitConfig, SecurityHeaders, LogEntry, HealthCheckResult, ServiceHealth, MonitoringAlert, PerformanceMetrics, BusinessMetrics, CallMetrics, LeadMetrics, RevenueMetrics, DashboardData, ExportOptions, ImportResult, BackupConfig, MigrationResult, FeatureFlag, A_BTest, ComplianceConfig, AuditLog, SystemConfig } from \'@/lib/types/common\';');
      content = importLines.join('\n');
      changesMade = true;
    }
  }

  // Apply type replacements
  for (const [oldType, newType] of Object.entries(TYPE_REPLACEMENTS)) {
    if (content.includes(oldType)) {
      content = content.replace(new RegExp(oldType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newType);
      changesMade = true;
    }
  }

  // Generic any replacements (be more careful with these)
  const genericReplacements = [
    { pattern: /:\s*any\b/g, replacement: ': unknown' },
    { pattern: /<any>/g, replacement: '<unknown>' },
    { pattern: /\bany\[\]/g, replacement: 'unknown[]' },
    { pattern: /Record<string,\s*any>/g, replacement: 'Record<string, unknown>' },
    { pattern: /Array<any>/g, replacement: 'Array<unknown>' },
    { pattern: /Promise<any>/g, replacement: 'Promise<unknown>' },
    { pattern: /Function<any>/g, replacement: 'Function<unknown>' },
    { pattern: /Map<string,\s*any>/g, replacement: 'Map<string, unknown>' },
    { pattern: /Set<any>/g, replacement: 'Set<unknown>' },
    { pattern: /WeakMap<any,\s*any>/g, replacement: 'WeakMap<unknown, unknown>' },
    { pattern: /WeakSet<any>/g, replacement: 'WeakSet<unknown>' },
    { pattern: /Partial<any>/g, replacement: 'Partial<unknown>' },
    { pattern: /Required<any>/g, replacement: 'Required<unknown>' },
    { pattern: /Pick<any,\s*any>/g, replacement: 'Pick<unknown, string>' },
    { pattern: /Omit<any,\s*any>/g, replacement: 'Omit<unknown, string>' },
    { pattern: /Exclude<any,\s*any>/g, replacement: 'Exclude<unknown, unknown>' },
    { pattern: /Extract<any,\s*any>/g, replacement: 'Extract<unknown, unknown>' },
    { pattern: /NonNullable<any>/g, replacement: 'NonNullable<unknown>' },
    { pattern: /ReturnType<any>/g, replacement: 'ReturnType<Function>' },
    { pattern: /Parameters<any>/g, replacement: 'Parameters<Function>' },
    { pattern: /ConstructorParameters<any>/g, replacement: 'ConstructorParameters<Function>' },
    { pattern: /InstanceType<any>/g, replacement: 'InstanceType<Function>' },
    { pattern: /ThisParameterType<any>/g, replacement: 'ThisParameterType<Function>' },
    { pattern: /OmitThisParameter<any>/g, replacement: 'OmitThisParameter<Function>' },
    { pattern: /ThisType<any>/g, replacement: 'ThisType<unknown>' },
    { pattern: /Uppercase<any>/g, replacement: 'Uppercase<string>' },
    { pattern: /Lowercase<any>/g, replacement: 'Lowercase<string>' },
    { pattern: /Capitalize<any>/g, replacement: 'Capitalize<string>' },
    { pattern: /Uncapitalize<any>/g, replacement: 'Uncapitalize<string>' },
  ];

  for (const { pattern, replacement } of genericReplacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changesMade = true;
    }
  }

  if (changesMade) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function traverseDirectory(dir) {
  let modifiedFilesCount = 0;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const relativeFilePath = path.relative(ROOT_DIR, filePath);

    if (shouldExcludeFile(relativeFilePath)) {
      continue;
    }

    if (fs.statSync(filePath).isDirectory()) {
      modifiedFilesCount += traverseDirectory(filePath);
    } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      console.log(`🔍 Processing: ${relativeFilePath}`);
      if (fixAnyTypes(filePath)) {
        modifiedFilesCount++;
        console.log(`✅ Fixed any types in ${relativeFilePath}\n`);
      } else {
        console.log(`ℹ️  No changes needed in ${relativeFilePath}\n`);
      }
    }
  }
  return modifiedFilesCount;
}

console.log('🔧 Fixing any types in TypeScript files...\n');
const totalModified = traverseDirectory(ROOT_DIR);

console.log(`📊 Summary:`);
console.log(`  - Files processed: ${totalModified + (fs.readdirSync(ROOT_DIR, { recursive: true }).filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).length - totalModified)}`); // Rough estimate
console.log(`  - Files modified: ${totalModified}\n`);

if (totalModified > 0) {
  console.log(`✅ Successfully fixed any types in ${totalModified} files!`);
  console.log(`\n🔍 Next steps:`);
  console.log(`1. Review the changes to ensure they look correct`);
  console.log(`2. Run TypeScript compiler to check for errors`);
  console.log(`3. Run tests to verify functionality still works`);
  process.exit(0);
} else {
  console.log('No any types found or fixed.');
  process.exit(0);
}













