import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { resetKickoffState } from './lib/kickoffOverrides';

/** Integration tests mutate kickoff cache; reset before each file for isolated unit tests. */
beforeEach(() => {
  resetKickoffState();
});
