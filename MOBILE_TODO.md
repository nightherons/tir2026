# Mobile Improvements - Backlog

## Medium Priority

### 6. CurrentRunners ticker cards too wide
- **File**: `client/src/components/dashboard/CurrentRunners.tsx` line 37
- **Issue**: `min-w-[160px] sm:min-w-[200px]` means only ~1.5 cards visible at once on 320px phones
- **Fix**: Reduce to `min-w-[140px] sm:min-w-[200px]` or switch to a stacked layout on mobile

### 7. Admin tables hide important columns on mobile
- **Files**: `client/src/components/admin/RunnersManager.tsx` line 338, `client/src/components/admin/LegsManager.tsx` lines 128-131
- **Issue**: Leg assignments, projected pace, start/end points hidden with `hidden sm:table-cell`
- **Fix**: Consider card layout on mobile instead of table, or use expandable rows

### 8. PinLogin circles tight on 320px
- **File**: `client/src/components/entry/PinLogin.tsx` line 45
- **Issue**: 6 PIN circles + `space-x-2` spacing is cramped on very small screens
- **Fix**: Reduce `space-x-2` to `space-x-1.5` or make circles slightly smaller on mobile

## Low Priority

### 9. City badge hidden on mobile in Leaderboard
- **File**: `client/src/components/dashboard/Leaderboard.tsx` line 229
- **Issue**: Team city (`hidden sm:inline-flex`) is invisible on mobile, losing Houston/Dallas context
- **Fix**: Could add city abbreviation (H/D) next to team name on mobile

### 10. Dashboard container padding
- **File**: `client/src/pages/Dashboard.tsx` line 98
- **Issue**: `px-4` on 320px screen leaves only 312px for content
- **Fix**: Change to `px-2 sm:px-4 lg:px-8`

### 11. RaceMap leg button text
- **File**: `client/src/components/dashboard/RaceMap.tsx` line 507
- **Issue**: `text-xs md:text-sm` is very small on mobile map
- **Fix**: Consider larger touch targets for leg selector buttons on mobile
