import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuPencil, LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useMemo, useState } from "react";
import { paymentsService } from "../services/payments";
import { membersService } from "../services/members";
import type {
  CreatePaymentRequest,
  MemberDTO,
  PaymentDTO,
  PaymentStatus,
  UpdatePaymentRequest,
} from "@alentapp/shared";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  createListCollection,
} from "../components/ui/select";

type PaymentFormData = CreatePaymentRequest & {
  estado: PaymentStatus;
  fecha_pago: string;
};

const statusCollection = createListCollection({
  items: [
    { label: "Pendiente", value: "Pendiente" },
    { label: "Pagado", value: "Pagado" },
    { label: "Cancelado", value: "Cancelado" },
  ],
});

const createInitialFormData = (): PaymentFormData => ({
  member_id: "",
  monto: 0,
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
  fecha_vencimiento: "",
  estado: "Pendiente",
  fecha_pago: "",
});

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>(createInitialFormData);

  const membersCollection = useMemo(
    () => createListCollection({
      items: members.map((member) => ({
        label: `${member.name} - DNI ${member.dni}`,
        value: member.id,
      })),
    }),
    [members],
  );

  const membersById = useMemo(() => {
    return new Map(members.map((member) => [member.id, member]));
  }, [members]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paymentsData, membersData] = await Promise.all([
        paymentsService.getAll(),
        membersService.getAll(),
      ]);
      setPayments(paymentsData);
      setMembers(membersData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cargar los pagos";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPaymentId(null);
    setFormData(createInitialFormData());
    setLocalError(null);
    setIsDialogOpen(true);
  };

  const openEditModal = (payment: PaymentDTO) => {
    setEditingPaymentId(payment.id);
    setFormData({
      member_id: payment.member_id,
      monto: payment.monto,
      mes: payment.mes,
      anio: payment.anio,
      fecha_vencimiento: payment.fecha_vencimiento,
      estado: payment.estado,
      fecha_pago: payment.fecha_pago ?? "",
    });
    setLocalError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!editingPaymentId && !formData.member_id) {
      setLocalError("El miembro no existe");
      return;
    }

    if (editingPaymentId && formData.estado === "Pagado" && !formData.fecha_pago) {
      setLocalError("La fecha de pago es obligatoria");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPaymentId) {
        const updateData: UpdatePaymentRequest = {
          monto: Number(formData.monto),
          mes: Number(formData.mes),
          anio: Number(formData.anio),
          fecha_vencimiento: formData.fecha_vencimiento,
          estado: formData.estado,
          ...(formData.fecha_pago ? { fecha_pago: formData.fecha_pago } : {}),
        };
        await paymentsService.update(editingPaymentId, updateData);
      } else {
        await paymentsService.create({
          member_id: formData.member_id,
          monto: Number(formData.monto),
          mes: Number(formData.mes),
          anio: Number(formData.anio),
          fecha_vencimiento: formData.fecha_vencimiento,
        });
      }
      setIsDialogOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al guardar el pago";
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedMember = membersById.get(formData.member_id);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(event) => setIsDialogOpen(event.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Registrá y consultá los pagos activos de socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Pago
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingPaymentId ? "Editar Pago" : "Agregar Nuevo Pago"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {localError && (
                  <Box p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200" fontSize="sm" fontWeight="medium">
                    {localError}
                  </Box>
                )}
                <Field label="Socio" required>
                  {editingPaymentId ? (
                    <Box p="3" bg="bg.muted" borderWidth="1px" borderRadius="md">
                      <Text fontWeight="medium">
                        {selectedMember ? `${selectedMember.name} - DNI ${selectedMember.dni}` : formData.member_id}
                      </Text>
                    </Box>
                  ) : (
                    <SelectRoot
                      collection={membersCollection}
                      value={formData.member_id ? [formData.member_id] : []}
                      onValueChange={(event) => setFormData({ ...formData, member_id: event.value[0] || "" })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione un socio" />
                      </SelectTrigger>
                      <SelectContent>
                        {membersCollection.items.map((member) => (
                          <SelectItem item={member} key={member.value}>
                            {member.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  )}
                </Field>
                <Field label="Monto" required>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.monto || ""}
                    onChange={(event) => setFormData({ ...formData, monto: Number(event.target.value) })}
                    required
                  />
                </Field>
                <Field label="Mes" required>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.mes || ""}
                    onChange={(event) => setFormData({ ...formData, mes: Number(event.target.value) })}
                    required
                  />
                </Field>
                <Field label="Año" required>
                  <Input
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.anio || ""}
                    onChange={(event) => setFormData({ ...formData, anio: Number(event.target.value) })}
                    required
                  />
                </Field>
                <Field label="Fecha de vencimiento" required>
                  <Input
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(event) => setFormData({ ...formData, fecha_vencimiento: event.target.value })}
                    required
                  />
                </Field>
                {editingPaymentId && (
                  <>
                    <Field label="Estado" required>
                      <SelectRoot
                        collection={statusCollection}
                        value={[formData.estado]}
                        onValueChange={(event) => setFormData({ ...formData, estado: event.value[0] as PaymentStatus })}
                      >
                        <SelectTrigger>
                          <SelectValueText placeholder="Seleccione el estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusCollection.items.map((status) => (
                            <SelectItem item={status} key={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </SelectRoot>
                    </Field>
                    <Field label="Fecha de pago">
                      <Input
                        type="date"
                        value={formData.fecha_pago}
                        onChange={(event) => setFormData({ ...formData, fecha_pago: event.target.value })}
                      />
                    </Field>
                  </>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingPaymentId ? "Guardar Cambios" : "Crear Pago"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando pagos...</Text>
              </Stack>
            </Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron pagos.</Text>
                <Button variant="ghost" onClick={fetchData}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Periodo</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Fecha de pago</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payments.map((payment) => (
                  <Table.Row key={payment.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {membersById.get(payment.member_id)?.name || payment.member_id}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">${payment.monto.toFixed(2)}</Table.Cell>
                    <Table.Cell color="fg.muted">{payment.mes}/{payment.anio}</Table.Cell>
                    <Table.Cell color="fg.muted">{payment.fecha_vencimiento}</Table.Cell>
                    <Table.Cell>
                      <Box display="inline-block" px="2" py="0.5" borderRadius="md" bg="yellow.50" color="yellow.700" fontSize="xs" fontWeight="bold">
                        {payment.estado}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{payment.fecha_pago || "-"}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label="Editar pago"
                        onClick={() => openEditModal(payment)}
                      >
                        <LuPencil />
                      </IconButton>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
