import { create } from 'zustand';
import { matches } from '../data/tournament';
import { Pick, PlayerPredictionState, TournamentBonusPick } from '../types';
import {
  affectedFutureMatches,
  lockableKnockoutMatchIds,
  shouldLockGroup,
  validatePick
} from './tournamentLogic';

interface AppState extends PlayerPredictionState {
  nowIso: string;
  setNow: (iso: string) => void;
  updateDraftPick: (matchId: string, pick: Pick) => string[];
  reviewAffectedMatch: (matchId: string) => void;
  setBonusDraft: (pick: TournamentBonusPick) => void;
  commitDraft: () => { ok: boolean; message: string };
  runAutoLocks: () => void;
}

const initialState: PlayerPredictionState = {
  committedPicks: {},
  draftPicks: {},
  affectedMatches: [],
  commitState: {
    version: 1,
    committedAt: new Date().toISOString(),
    groupLocked: false
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,
  nowIso: new Date().toISOString(),
  setNow: (iso) => set({ nowIso: iso }),
  updateDraftPick: (matchId, pick) => {
    const match = matches.find((item) => item.id === matchId);
    if (!match) return ['Match not found'];

    const errors = validatePick(match, pick);
    const impacted = affectedFutureMatches(matchId);

    set((state) => ({
      draftPicks: {
        ...state.draftPicks,
        [matchId]: {
          ...pick,
          reviewed: true
        },
        ...Object.fromEntries(
          impacted.map((id) => {
            const previous = state.draftPicks[id] ?? state.committedPicks[id];
            if (!previous) return [id, undefined];
            return [id, { ...previous, reviewed: false }];
          })
        )
      },
      affectedMatches: [...new Set([...state.affectedMatches, ...impacted])]
    }));

    return errors;
  },
  reviewAffectedMatch: (matchId) => {
    set((state) => ({
      draftPicks: {
        ...state.draftPicks,
        [matchId]: {
          ...(state.draftPicks[matchId] ?? state.committedPicks[matchId]),
          reviewed: true
        }
      },
      affectedMatches: state.affectedMatches.filter((id) => id !== matchId)
    }));
  },
  setBonusDraft: (bonusDraft) => set({ bonusDraft }),
  commitDraft: () => {
    const state = get();

    const hasUnreviewed = state.affectedMatches.some((matchId) => {
      const pick = state.draftPicks[matchId] ?? state.committedPicks[matchId];
      return !pick?.reviewed;
    });

    if (hasUnreviewed) {
      return { ok: false, message: 'Review affected fixtures and Commit changes.' };
    }

    const pendingMatches = Object.keys(state.draftPicks);
    for (const matchId of pendingMatches) {
      const match = matches.find((item) => item.id === matchId);
      const pick = state.draftPicks[matchId];
      if (!match || !pick) continue;
      const errors = validatePick(match, pick);
      if (errors.length > 0) {
        return { ok: false, message: errors[0] };
      }
    }

    set((prev) => ({
      committedPicks: { ...prev.committedPicks, ...prev.draftPicks },
      bonusCommitted: prev.bonusDraft ?? prev.bonusCommitted,
      draftPicks: {},
      affectedMatches: [],
      commitState: {
        ...prev.commitState,
        version: prev.commitState.version + 1,
        committedAt: prev.nowIso
      }
    }));

    return { ok: true, message: 'Changes committed successfully.' };
  },
  runAutoLocks: () => {
    const { nowIso, committedPicks } = get();

    const groupLocked = shouldLockGroup(nowIso);
    const koLockedIds = new Set(lockableKnockoutMatchIds(nowIso));

    set((state) => ({
      commitState: {
        ...state.commitState,
        groupLocked: state.commitState.groupLocked || groupLocked
      },
      committedPicks: Object.fromEntries(
        Object.entries(committedPicks).map(([matchId, pick]) => {
          const match = matches.find((item) => item.id === matchId);
          if (!match) return [matchId, pick];
          const locked = match.stage === 'GROUP' ? groupLocked : koLockedIds.has(matchId);
          return [matchId, { ...pick, reviewed: true, locked }];
        })
      )
    }));
  }
}));
