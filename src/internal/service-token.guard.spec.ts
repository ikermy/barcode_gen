import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ServiceTokenGuard } from './service-token.guard';

const makeContext = (headers: Record<string, string>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name.toLowerCase()],
      }),
    }),
  }) as unknown as ExecutionContext;

describe('ServiceTokenGuard', () => {
  const guard = new ServiceTokenGuard();
  const previous = process.env.BARCODEGEN_SERVICE_TOKEN;

  beforeEach(() => {
    process.env.BARCODEGEN_SERVICE_TOKEN = 'secret-token';
  });

  afterAll(() => {
    process.env.BARCODEGEN_SERVICE_TOKEN = previous;
  });

  it('rejects missing token', () => {
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects wrong token', () => {
    expect(() =>
      guard.canActivate(makeContext({ 'x-service-token': 'nope' })),
    ).toThrow(UnauthorizedException);
  });

  it('accepts valid token via x-service-token', () => {
    expect(
      guard.canActivate(makeContext({ 'x-service-token': 'secret-token' })),
    ).toBe(true);
  });

  it('accepts valid token via Authorization bearer', () => {
    expect(
      guard.canActivate(makeContext({ authorization: 'Bearer secret-token' })),
    ).toBe(true);
  });
});
