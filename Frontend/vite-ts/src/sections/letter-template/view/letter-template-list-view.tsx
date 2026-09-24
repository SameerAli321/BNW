import type { TableHeadCellProps } from 'src/components/table';

import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableBody from '@mui/material/TableBody';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetLetterTemplates } from 'src/actions/letters';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableNoData, TableHeadCustom } from 'src/components/table';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';
import { RoleBasedGuard } from 'src/auth/guard';

import { LetterTemplateTableRow } from '../letter-template-table-row';

// ----------------------------------------------------------------------

const TABLE_HEAD: TableHeadCellProps[] = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type', width: 140 },
  { id: 'roleScope', label: 'Role scope', width: 160 },
  { id: 'version', label: 'Version', width: 90, align: 'center' },
  { id: 'fields', label: 'Fields', width: 90, align: 'center' },
  { id: 'isActive', label: 'Status', width: 110 },
  { id: '', width: 80 },
];

/**
 * Letter Templates — HR/CEO/ADMIN read, ADMIN-only create/edit per docs/API_CONTRACT_SPRINT3.md.
 * Deliberately a plain list, not a rich template editor — templates are dummy/placeholder content
 * this sprint (scope cut #1).
 */
export function LetterTemplateListView() {
  const { user: currentAuthUser } = useAuthContext();
  const currentRole = currentAuthUser?.role ?? '';
  const canManage = currentRole === 'ADMIN';

  const { templates, templatesLoading } = useGetLetterTemplates();

  const notFound = !templatesLoading && !templates.length;

  return (
    <RoleBasedGuard hasContent currentRole={currentRole} allowedRoles={['HR', 'CEO', 'ADMIN']}>
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Letter Templates"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Letters', href: paths.dashboard.letters.root },
            { name: 'Templates' },
          ]}
          action={
            canManage && (
              <Button
                component={RouterLink}
                href={paths.dashboard.letterTemplates.new}
                variant="contained"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                New template
              </Button>
            )
          }
          sx={{ mb: { xs: 3, md: 5 } }}
        />

        <Scrollbar>
          <Table sx={{ minWidth: 800 }}>
            <TableHeadCustom headCells={TABLE_HEAD} rowCount={templates.length} />

            <TableBody>
              {templates.map((row) => (
                <LetterTemplateTableRow
                  key={row.id}
                  row={row}
                  editHref={canManage ? paths.dashboard.letterTemplates.edit(row.id) : undefined}
                />
              ))}

              <TableNoData notFound={notFound} />
            </TableBody>
          </Table>
        </Scrollbar>
      </DashboardContent>
    </RoleBasedGuard>
  );
}
