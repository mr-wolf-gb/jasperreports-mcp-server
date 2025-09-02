// Basic test to verify Jest configuration
describe('Project Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(global.testConfig).toBeDefined();
    expect(global.testConfig.jasperUrl).toBe('http://localhost:8080/jasperserver');
  });

  it('should have console available', () => {
    expect(typeof console.log).toBe('function');
    expect(console.log).toBeDefined();
  });
});
