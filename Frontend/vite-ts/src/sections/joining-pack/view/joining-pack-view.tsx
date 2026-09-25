import type { JoiningPackItemDto } from 'src/types/candidate';

import { useState } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';

import { fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetJoiningPackItems, acknowledgeJoiningPackItem } from 'src/actions/joining-pack';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { JOINING_PACK_ITEM_KIND_OPTIONS } from 'src/types/candidate';

import { JoiningPackItemDialog } from '../joining-pack-item-dialog';

// ----------------------------------------------------------------------

const KIND_LABEL = new Map(JOINING_PACK_ITEM_KIND_OPTIONS.map((o) => [o.value, o.label]));

/**
 * Joining pack — `GET /joining-pack-items` + acknowledge, reachable by every role (see
 * docs/API_CONTRACT_SPRINT5.md's frontend section: "visible to every role, since every employee
 * needs to see and acknowledge their own joining pack"). HR/ADMIN additionally get inline manage
 * controls (add/edit item) on this same screen rather than a separate CRUD page — same data,
 * same `GET /joining-pack-items` list either way.
 */
export function JoiningPackView() {
  const { user: currentAuthUser } = useAuthContext();
  const canManage = ['HR', 'ADMIN'].includes(currentAuthUser?.role ?? '');

  const { items, itemsLoading } = useGetJoiningPackItems();

  const itemDialog = useBoolean();
  const [editingItem, setEditingItem] = useState<JoiningPackItemDto | undefined>(undefined);
  const [acking, setAcking] = useState<number | null>(null);

  const handleAcknowledge = async (item: JoiningPackItemDto) => {
    if (item.acknowledged) return;
    setAcking(item.id);
    try {
      await acknowledgeJoiningPackItem(item.id);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Acknowledge failed!');
    } finally {
      setAcking(null);
    }
  };

  const openNewItem = () => {
    setEditingItem(undefined);
    itemDialog.onTrue();
  };

  const openEditItem = (item: JoiningPackItemDto) => {
    setEditingItem(item);
    itemDialog.onTrue();
  };

  const visibleItems = canManage ? items : items.filter((item) => item.isActive);

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Joining Pack"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Joining Pack' }]}
        action={
          canManage && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={openNewItem}
            >
              New item
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {itemsLoading && <LoadingScreen />}

      {!itemsLoading && !visibleItems.length && (
        <Stack sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
          No joining pack items yet.
        </Stack>
      )}

      {!itemsLoading && !!visibleItems.length && (
        <Stack spacing={2}>
          {visibleItems.map((item) => (
            <Card key={item.id}>
              <CardHeader
                title={item.title}
                subheader={KIND_LABEL.get(item.kind)}
                action={
                  <Stack direction="row" spacing={1} alignItems="center">
                    {!item.isActive && (
                      <Label variant="soft" color="default">
                        Inactive
                      </Label>
                    )}
                    {canManage && (
                      <IconButton onClick={() => openEditItem(item)}>
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    )}
                  </Stack>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {item.description && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', mb: 2 }}
                  >
                    {item.description}
                  </Typography>
                )}

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.acknowledged}
                      disabled={item.acknowledged || acking === item.id}
                      onChange={() => handleAcknowledge(item)}
                    />
                  }
                  label={
                    item.acknowledged
                      ? `Acknowledged${item.acknowledgedAt ? ` — ${fDateTime(item.acknowledgedAt)}` : ''}`
                      : 'I have read this'
                  }
                />
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <JoiningPackItemDialog
        open={itemDialog.value}
        onClose={itemDialog.onFalse}
        currentItem={editingItem}
      />
    </DashboardContent>
  );
}
