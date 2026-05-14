import {
    Button,
    Center,
    Heading,
    HStack,
    Stack,
    Table,
    Text,
    Badge,
    Box,
    Flex,
    Input,
    Textarea,
    Checkbox,
    Spinner,
} from "@chakra-ui/react";
import { LuPencil, LuPlus, LuSearch, LuShieldOff, LuX } from "react-icons/lu";
import { useState, useEffect } from "react";
import { disciplinesService } from "../services/disciplines";
import { membersService } from "../services/members";
import type { CreateDisciplineRequest, DisciplineDTO, MemberDTO, UpdateDisciplineRequest } from "@alentapp/shared";
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

// Helper para resolver el problema de timezone al mostrar fechas (evita que se muestren con un día menos por la conversión a UTC)
const formatDate = (iso: string): string => {
    const [year, month, day] = iso.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
};

const emptyForm = (): CreateDisciplineRequest => ({
    memberId: "",
    motivo: "",
    fechaInicio: "",
    fechaFin: "",
    esSuspensionTotal: true,
    motivoLevantamiento: null,
});

export function DisciplinesView() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateDisciplineRequest>(emptyForm());

    // Estado de la lista
    const [disciplines, setDisciplines] = useState<DisciplineDTO[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);

    // Estado de búsqueda por DNI
    const [dniInput, setDniInput] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [foundMember, setFoundMember] = useState<MemberDTO | null>(null);
    const [dniError, setDniError] = useState<string | null>(null);

    // Estado modal editar
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<UpdateDisciplineRequest>({});
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);

    // Estado modal levantar
    const [isLiftOpen, setIsLiftOpen] = useState(false);
    const [liftingId, setLiftingId] = useState<string | null>(null);
    const [liftMotivo, setLiftMotivo] = useState("");
    const [isLiftSubmitting, setIsLiftSubmitting] = useState(false);

    // Mapa de socios (id → MemberDTO) para mostrar nombres en la tabla
    const [membersMap, setMembersMap] = useState<Map<string, MemberDTO>>(new Map());

    // Filtro de búsqueda de la tabla
    const [filterQuery, setFilterQuery] = useState("");

    const openEditModal = (d: DisciplineDTO) => {
        setEditingId(d.id);
        setEditForm({
            motivo: d.motivo,
            fechaInicio: d.fechaInicio.split("T")[0],
            fechaFin: d.fechaFin.split("T")[0],
            esSuspensionTotal: d.esSuspensionTotal,
            ...(d.motivoLevantamiento !== null && { motivoLevantamiento: d.motivoLevantamiento }),
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        setIsEditSubmitting(true);
        try {
            await disciplinesService.update(editingId, {
                ...editForm,
                ...(editForm.fechaInicio && { fechaInicio: new Date(editForm.fechaInicio).toISOString() }),
                ...(editForm.fechaFin && { fechaFin: new Date(editForm.fechaFin).toISOString() }),
            });
            setIsEditOpen(false);
            fetchDisciplines();
        } catch (err: any) {
            alert(err.message || "Error al modificar la sanción");
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const openLiftModal = (d: DisciplineDTO) => {
        setLiftingId(d.id);
        setLiftMotivo("");
        setIsLiftOpen(true);
    };

    const handleLiftSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!liftingId || !liftMotivo.trim()) return;
        setIsLiftSubmitting(true);
        try {
            await disciplinesService.update(liftingId, { motivoLevantamiento: liftMotivo.trim() });
            setIsLiftOpen(false);
            fetchDisciplines();
        } catch (err: any) {
            alert(err.message || "Error al levantar la sanción");
        } finally {
            setIsLiftSubmitting(false);
        }
    };

    const fetchDisciplines = async () => {
        setIsLoading(true);
        setListError(null);
        try {
            const data = await disciplinesService.getAll();
            setDisciplines(data);
        } catch (err: any) {
            setListError(err.message || "Error al cargar las sanciones");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            setListError(null);
            try {
                const [disciplinesData, membersData] = await Promise.all([
                    disciplinesService.getAll(),
                    membersService.getAll(),
                ]);
                setDisciplines(disciplinesData);
                const map = new Map<string, MemberDTO>();
                membersData.forEach((m) => map.set(m.id, m));
                setMembersMap(map);
            } catch (err: any) {
                setListError(err.message || "Error al cargar los datos");
            } finally {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const openCreateModal = () => {
        setFormData(emptyForm());
        setDniInput("");
        setFoundMember(null);
        setDniError(null);
        setIsDialogOpen(true);
    };

    const handleSearchByDni = async () => {
        if (!dniInput.trim()) return;
        setIsSearching(true);
        setFoundMember(null);
        setDniError(null);
        try {
            const member = await membersService.getByDni(dniInput.trim());
            setFoundMember(member);
            setFormData((prev) => ({ ...prev, memberId: member.id }));
        } catch (err: any) {
            setDniError(err.message || "Socio no encontrado");
            setFormData((prev) => ({ ...prev, memberId: "" }));
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await disciplinesService.create({
                ...formData,
                fechaInicio: new Date(formData.fechaInicio).toISOString(),
                fechaFin: new Date(formData.fechaFin).toISOString(),
            });
            setIsDialogOpen(false);
            fetchDisciplines();
            alert("Sanción registrada exitosamente");
        } catch (err: any) {
            alert(err.message || "Error al registrar la sanción");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredDisciplines = filterQuery.trim() === ""
        ? disciplines
        : disciplines.filter((d) => {
              const member = membersMap.get(d.memberId);
              if (!member) return false;
              const q = filterQuery.toLowerCase();
              return member.name.toLowerCase().includes(q) || member.dni.includes(q);
          });

    return (
        <>
        <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">
                            Administración de Sanciones
                        </Heading>
                        <Text color="fg.muted" fontSize="md">
                            Registrá suspensiones y faltas de conducta de los socios del club.
                        </Text>
                    </Stack>
                    <HStack gap="3">
                        <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                            <LuPlus /> Registrar Sanción
                        </Button>
                    </HStack>
                </Flex>

                {/* Modal para registrar sanción */}
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Registrar Nueva Sanción</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <Stack gap="4">
                                {/* Búsqueda por DNI */}
                                <Field label="DNI del Socio" required>
                                    <HStack gap="2" width="100%">
                                        <Input
                                            placeholder="Ej. 12345678"
                                            value={dniInput}
                                            onChange={(e) => {
                                                setDniInput(e.target.value);
                                                setFoundMember(null);
                                                setDniError(null);
                                                setFormData((prev) => ({ ...prev, memberId: "" }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSearchByDni();
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleSearchByDni}
                                            disabled={!dniInput.trim() || isSearching}
                                            minW="fit-content"
                                        >
                                            {isSearching ? <Spinner size="sm" /> : <LuSearch />}
                                            Buscar
                                        </Button>
                                    </HStack>
                                    {/* Confirmación visual del socio encontrado */}
                                    {foundMember && (
                                        <Box mt="2" px="3" py="2" bg="green.50" borderRadius="md" borderWidth="1px" borderColor="green.200">
                                            <Text fontSize="sm" color="green.700" fontWeight="semibold">
                                                ✓ {foundMember.name} — {foundMember.category} ({foundMember.status})
                                            </Text>
                                        </Box>
                                    )}
                                    {dniError && (
                                        <Box mt="2" px="3" py="2" bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
                                            <Text fontSize="sm" color="red.700">{dniError}</Text>
                                        </Box>
                                    )}
                                </Field>

                                <Field label="Motivo de la sanción" required>
                                    <Input
                                        placeholder="Ej. Conducta inapropiada en instalaciones"
                                        value={formData.motivo}
                                        onChange={(e) =>
                                            setFormData({ ...formData, motivo: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de inicio" required>
                                    <Input
                                        type="date"
                                        value={formData.fechaInicio}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fechaInicio: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de fin" required>
                                    <Input
                                        type="date"
                                        value={formData.fechaFin}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fechaFin: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="">
                                    <Checkbox.Root
                                        checked={formData.esSuspensionTotal}
                                        onCheckedChange={(details) =>
                                            setFormData({
                                                ...formData,
                                                esSuspensionTotal: !!details.checked,
                                            })
                                        }
                                    >
                                        <Checkbox.HiddenInput />
                                        <Checkbox.Control />
                                        <Checkbox.Label>Suspensión total (bloquea todos los servicios)</Checkbox.Label>
                                    </Checkbox.Root>
                                </Field>
                            </Stack>
                        </DialogBody>
                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogActionTrigger>
                            <Button
                                type="submit"
                                colorPalette="blue"
                                loading={isSubmitting}
                                disabled={!foundMember}
                            >
                                Registrar Sanción
                            </Button>
                        </DialogFooter>
                        <DialogCloseTrigger />
                    </form>
                </DialogContent>

                {listError && (
                    <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
                        <Text fontWeight="bold">Error:</Text>
                        <Text>{listError}</Text>
                    </Box>
                )}

                {/* Filtro de búsqueda por nombre o DNI */}
                <HStack gap="2">
                    <Box position="relative" flex="1" maxW="400px">
                        <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="fg.muted" pointerEvents="none">
                            <LuSearch />
                        </Box>
                        <Input
                            pl="9"
                            placeholder="Buscar sanciones por nombre o DNI del socio…"
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                        />
                    </Box>
                    {filterQuery && (
                        <Button variant="ghost" size="sm" onClick={() => setFilterQuery("")}>
                            <LuX /> Limpiar
                        </Button>
                    )}
                </HStack>

                <Box
                    bg="bg.panel"
                    borderRadius="xl"
                    boxShadow="sm"
                    borderWidth="1px"
                    overflow="hidden"
                    minH="200px"
                    position="relative"
                >
                    {isLoading ? (
                        <Center h="200px">
                            <Stack align="center" gap="4">
                                <Spinner size="xl" color="blue.500" />
                                <Text color="fg.muted">Cargando sanciones...</Text>
                            </Stack>
                        </Center>
                    ) : filteredDisciplines.length === 0 ? (
                        <Center h="200px">
                            <Text color="fg.muted">
                                {filterQuery.trim() ? "No se encontraron sanciones para el socio buscado." : "No hay sanciones registradas."}
                            </Text>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Motivo</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha inicio</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha fin</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Es suspensión total</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {filteredDisciplines.map((d) => {
                                    const isLiftable = d.motivoLevantamiento === null && new Date(d.fechaFin) > new Date();
                                    return (
                                    <Table.Row key={d.id} _hover={{ bg: "bg.muted/30" }}>
                                        <Table.Cell fontWeight="medium" color="fg.emphasized">{membersMap.get(d.memberId)?.name ?? d.memberId}</Table.Cell>
                                        <Table.Cell fontWeight="semibold" color="fg.emphasized">{d.motivo}</Table.Cell>
                                        <Table.Cell color="fg.muted">{formatDate(d.fechaInicio)}</Table.Cell>
                                        <Table.Cell color="fg.muted">{formatDate(d.fechaFin)}</Table.Cell>
                                        <Table.Cell>
                                            <Badge colorPalette={d.esSuspensionTotal ? "red" : "orange"}>
                                                {d.esSuspensionTotal ? "Si" : "No"}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            {d.motivoLevantamiento ? (
                                                <Badge colorPalette="green">Levantada</Badge>
                                            ) : new Date(d.fechaFin) <= new Date() ? (
                                                <Badge colorPalette="gray">Caducada</Badge>
                                            ) : (
                                                <Badge colorPalette="red">Vigente</Badge>
                                            )}
                                        </Table.Cell>
                                        <Table.Cell textAlign="end">
                                            <HStack gap="2" justify="end">
                                                <Button size="sm" variant="outline" onClick={() => openEditModal(d)}>
                                                    <LuPencil /> Editar
                                                </Button>
                                                {isLiftable && (
                                                    <Button size="sm" colorPalette="orange" variant="outline" onClick={() => openLiftModal(d)}>
                                                        <LuShieldOff /> Levantar
                                                    </Button>
                                                )}
                                            </HStack>
                                        </Table.Cell>
                                    </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Box>
            </Stack>
        </DialogRoot>

        {/* Modal Editar Sanción */}
        <DialogRoot open={isEditOpen} onOpenChange={(e) => setIsEditOpen(e.open)}>
            <DialogContent>
                <form onSubmit={handleEditSubmit}>
                    <DialogHeader>
                        <DialogTitle>Editar Sanción</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Stack gap="4">
                            <Field label="Motivo" required>
                                <Input
                                    value={editForm.motivo ?? ""}
                                    onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="Fecha de inicio" required>
                                <Input
                                    type="date"
                                    value={editForm.fechaInicio ?? ""}
                                    onChange={(e) => setEditForm({ ...editForm, fechaInicio: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="Fecha de fin" required>
                                <Input
                                    type="date"
                                    value={editForm.fechaFin ?? ""}
                                    onChange={(e) => setEditForm({ ...editForm, fechaFin: e.target.value })}
                                    required
                                />
                            </Field>
                            <Field label="">
                                <Checkbox.Root
                                    checked={editForm.esSuspensionTotal ?? false}
                                    onCheckedChange={(details) =>
                                        setEditForm({ ...editForm, esSuspensionTotal: !!details.checked })
                                    }
                                >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control />
                                    <Checkbox.Label>Suspensión total</Checkbox.Label>
                                </Checkbox.Root>
                            </Field>
                            {editForm.motivoLevantamiento !== undefined && (
                                <Field label="Motivo del levantamiento" required>
                                    <Input
                                        value={editForm.motivoLevantamiento ?? ""}
                                        onChange={(e) => setEditForm({ ...editForm, motivoLevantamiento: e.target.value })}
                                        required
                                    />
                                </Field>
                            )}
                        </Stack>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogActionTrigger>
                        <Button type="submit" colorPalette="blue" loading={isEditSubmitting}>
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </form>
            </DialogContent>
        </DialogRoot>

        {/* Modal Levantar Sanción */}
        <DialogRoot open={isLiftOpen} onOpenChange={(e) => setIsLiftOpen(e.open)}>
            <DialogContent>
                <form onSubmit={handleLiftSubmit}>
                    <DialogHeader>
                        <DialogTitle>Levantar Sanción</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <Stack gap="4">
                            <Text color="fg.muted" fontSize="sm">
                                Ingresá el motivo del levantamiento. Esta acción no se puede deshacer.
                            </Text>
                            <Field label="Motivo del levantamiento" required>
                                <Textarea
                                    placeholder="Ej. Buen comportamiento sostenido durante 30 días"
                                    value={liftMotivo}
                                    onChange={(e) => setLiftMotivo(e.target.value)}
                                    required
                                />
                            </Field>
                        </Stack>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogActionTrigger>
                        <Button
                            type="submit"
                            colorPalette="orange"
                            loading={isLiftSubmitting}
                            disabled={!liftMotivo.trim()}
                        >
                            Confirmar Levantamiento
                        </Button>
                    </DialogFooter>
                    <DialogCloseTrigger />
                </form>
            </DialogContent>
        </DialogRoot>
        </>
    );
}