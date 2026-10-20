import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';

import { useGetLetters, fetchLetterPdfBlob } from 'src/actions/letters';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';
import { usePdfViewer, PdfViewerDialog } from 'src/components/pdf-viewer';

import { LetterStatusLabel } from '../letter/letter-status-label';

// ----------------------------------------------------------------------

type Props = {
  userId: number | string;
  /**
   * HR/CEO/ADMIN: every letter of this employee (`GET /letters?subjectUserId=`). Otherwise the
   * record's own owner: `GET /letters` already returns only their own letters, and only once sent
   * to them (SENT_TO_EMPLOYEE / SIGNED) — the backend filters that, not this component.
   */
  isPrivileged: boolean;
};

/** E-record "Letters" card — the employee's letters / contracts with a link and in-app PDF view. */
export function EmployeeLettersCard({ userId, isPrivileged }: Props) {
  const { letters, lettersLoading } = useGetLetters(
    isPrivileged ? { subjectUserId: Number(userId), limit: 50 } : { limit: 50 }
  );
  const { openViewer, viewerProps } = usePdfViewer();

  return (
    <Card>
      <CardHeader
        title="Letters"
        subheader={lettersLoading ? 'Loading…' : `${letters.length} letter${letters.length === 1 ? '' : 's'}`}
        sx={{ mb: 2 }}
      />

      <Scrollbar>
        <Table sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell>Letter</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">PDF</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {letters.map((letter) => (
              <TableRow key={letter.id} hover>
                <TableCell>
                  <Link
                    component={RouterLink}
                    href={paths.dashboard.letters.details(letter.id)}
                    variant="body2"
                    color="inherit"
                  >
                    {letter.templateName}
                  </Link>
                </TableCell>
                <TableCell>
                  <LetterStatusLabel status={letter.status} />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(letter.updatedAt)}</TableCell>
                <TableCell align="right">
                  {letter.hasPdf && (
                    <Tooltip title="View PDF">
                      <IconButton
                        onClick={() =>
                          openViewer({
                            title: letter.templateName,
                            filename: `${letter.type.toLowerCase()}-letter-${letter.id}.pdf`,
                            load: () => fetchLetterPdfBlob(letter.id),
                          })
                        }
                      >
                        <Iconify icon="solar:eye-bold" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}

            <TableNoData notFound={!lettersLoading && !letters.length} />
          </TableBody>
        </Table>
      </Scrollbar>

      <PdfViewerDialog {...viewerProps} />
    </Card>
  );
}
