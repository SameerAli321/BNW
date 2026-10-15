import type { BookingType } from 'src/actions/bookings';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';

import { useGetBooking } from 'src/actions/bookings';
import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BookingForm } from '../booking-form';
import { BOOKING_TYPES, BOOKING_TYPE_META } from '../booking-utils';

// ----------------------------------------------------------------------

/** New booking — `?type=MEETING|MEETING_ROOM|POOL_TABLE&date=YYYY-MM-DD&time=HH:mm` pre-fill it. */
export function BookingCreateView() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const type = BOOKING_TYPES.find((t) => t === typeParam) as BookingType | undefined;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={type ? BOOKING_TYPE_META[type].action : 'New booking'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookings', href: paths.dashboard.bookings.root },
          { name: 'New booking' },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />
      <BookingForm
        initialType={type}
        initialDate={searchParams.get('date') ?? undefined}
        initialTime={searchParams.get('time') ?? undefined}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

/** Edit / reschedule — only while it's upcoming and the viewer may manage it. */
export function BookingEditView({ id }: { id: string }) {
  const { booking, bookingLoading, bookingError } = useGetBooking(id);

  if (bookingLoading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  const editable =
    !!booking && booking.canManage && booking.status === 'CONFIRMED' && !booking.isPast;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={booking ? `Edit: ${booking.title}` : 'Edit booking'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Bookings', href: paths.dashboard.bookings.root },
          ...(booking
            ? [{ name: booking.title, href: paths.dashboard.bookings.details(booking.id) }]
            : []),
          { name: 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 4 } }}
      />
      {bookingError || !booking ? (
        <EmptyContent
          filled
          title="Unable to load this booking"
          description="Either it doesn't exist, or you don't have permission to view it."
          sx={{ py: 10 }}
        />
      ) : !editable ? (
        <EmptyContent
          filled
          title="This booking can't be changed"
          description={
            booking.status === 'CANCELLED'
              ? 'It was cancelled — make a new booking instead.'
              : booking.isPast
                ? 'It has already ended.'
                : 'Only the organiser (or HR / Admin for rooms and tables) can change it.'
          }
          sx={{ py: 10 }}
        />
      ) : (
        <BookingForm currentBooking={booking} />
      )}
    </DashboardContent>
  );
}
