import type { BookingType } from 'src/actions/bookings';

import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { MEETING_ORGANIZER_ROLES } from 'src/actions/bookings';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { useAuthContext } from 'src/auth/hooks';

import { BOOKING_TYPES, BOOKING_TYPE_META } from './booking-utils';

// ----------------------------------------------------------------------

/** URL for the booking form, optionally pre-set to a type / day / start time. */
export function newBookingHref(options: { type?: BookingType; date?: string; time?: string } = {}) {
  const params = new URLSearchParams(
    Object.entries(options).filter((entry): entry is [string, string] => !!entry[1])
  );
  const query = params.toString();
  return query ? `${paths.dashboard.bookings.new}?${query}` : paths.dashboard.bookings.new;
}

/** "New booking" button with the three options (Book a meeting only for organisers). */
export function BookingNewMenu() {
  const router = useRouter();
  const popover = usePopover();
  const { user } = useAuthContext();
  const canOrganize = MEETING_ORGANIZER_ROLES.includes(user?.role ?? '');
  const types = BOOKING_TYPES.filter((type) => type !== 'MEETING' || canOrganize);

  return (
    <>
      <Button
        variant="contained"
        startIcon={<Iconify icon="mingcute:add-line" />}
        endIcon={<Iconify icon="eva:arrow-ios-downward-fill" width={16} />}
        onClick={popover.onOpen}
        aria-haspopup="menu"
      >
        New booking
      </Button>
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'top-right' } }}
      >
        <MenuList>
          {types.map((type) => {
            const meta = BOOKING_TYPE_META[type];
            return (
              <MenuItem
                key={type}
                onClick={() => {
                  popover.onClose();
                  router.push(newBookingHref({ type }));
                }}
                sx={{ alignItems: 'flex-start', py: 1 }}
              >
                <Iconify icon={meta.icon} sx={{ color: `${meta.color}.main`, mt: 0.25 }} />
                <Box>
                  <Typography variant="subtitle2">{meta.action}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {meta.description}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </MenuList>
      </CustomPopover>
    </>
  );
}
