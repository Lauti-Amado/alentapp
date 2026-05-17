import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useMemo, useState } from "react";
import { paymentsService } from "../services/payments";
import { membersService } from "../services/members";
import type { CreatePaymentRequest, MemberDTO, PaymentDTO } from "@alentapp/shared";
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

const initialFormData: CreatePaymentRequest = {
  member_id: "",
  monto: 0,
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
  fecha_vencimiento: "",
};

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentRequest>(initialFormData);

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
    setFormData(initialFormData);
    setLocalError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!formData.member_id) {
      setLocalError("El miembro no existe");
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentsService.create({
        ...formData,
        monto: Number(formData.monto),
        mes: Number(formData.mes),
        anio: Number(formData.anio),
      });
      setIsDialogOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al crear el pago";
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
              <DialogTitle>Agregar Nuevo Pago</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {localError && (
                  <Box p="3" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200" fontSize="sm" fontWeight="medium">
                    {localError}
                  </Box>
                )}
                <Field label="Socio" required>
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
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Pago
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
