import { Button, Center, Heading, HStack, Stack, Table, Text, Badge, Box, Flex, Input, Textarea, Checkbox, Spinner,} from "@chakra-ui/react";
import { LuPencil, LuPlus, LuSearch, LuShieldOff, LuTrash2, LuX } from "react-icons/lu";
import { useState, useEffect } from "react";
import { medicalCertificatesService } from "../services/medicalCertificates";
import { membersService } from "../services/members";
import type { CreateMedicalCertificateRequest, MedicalCertificateDTO, MemberDTO } from "@alentapp/shared";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger,} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

// Helper para resolver el problema de timezone al mostrar fechas (evita que se muestren con un día menos por la conversión a UTC)
const formatDate = (iso: string): string => {
    const [year, month, day] = iso.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
};

const emptyForm = (): CreateMedicalCertificateRequest => ({
    member_id: "",
    fecha_emision: "",
    fecha_vencimiento: "",
    esta_validado: true,
    licencia_doctor: "",
});

export function MedicalCertificatesView() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateMedicalCertificateRequest>(emptyForm());

    // Estado de la lista
    const [medicalCertificates, setMedicalCertificates] = useState<MedicalCertificateDTO[]>([]);
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
    const [editForm, setEditForm] = useState<UpdateMedicalCertificateRequest>({});
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

    const openEditModal = (d: MedicalCertificateDTO) => {
        setEditingId(d.id);
        setEditForm({
            fecha_emision: d.fecha_emision.split("T")[0],
            fecha_vencimiento: d.fecha_vencimiento.split("T")[0],
            esta_validado: d.esta_validado,
        });
        setIsEditOpen(true);
    };
    const openLiftModal = (d: MedicalCertificateDTO) => {
        setLiftingId(d.id);
        setLiftMotivo("");
        setIsLiftOpen(true);
    };

    const fetchDisciplines = async () => {
        setIsLoading(true);
        setListError(null);
        try {
            const data = await medicalCertificatesService.getAll();
            setMedicalCertificates(data);
        } catch (err: any) {
            setListError(err.message || "Error al cargar los certificados médicos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            setListError(null);
            try {
                const [medicalCertificatesData, membersData] = await Promise.all([
                    medicalCertificatesService.getAll(),
                    membersService.getAll(),
                ]);
                setMedicalCertificates(medicalCertificatesData);
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
            await medicalCertificatesService.create({
                ...formData,
                fecha_emision: new Date(formData.fecha_emision).toISOString(),
                fecha_vencimiento: new Date(formData.fecha_vencimiento).toISOString(),
            });
            setIsDialogOpen(false);
            fetchMedicalCertificates();
            alert("Certificado médico registrado exitosamente");
        } catch (err: any) {
            alert(err.message || "Error al registrar el certificado médico");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMedicalCertificate = filterQuery.trim() === ""
        ? medicalCertificates
        : medicalCertificates.filter((m) => {
              const member = membersMap.get(m.memberId);
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
                            Administración de Certificados médicos
                        </Heading>
                        <Text color="fg.muted" fontSize="md">
                            Registrá certificados médicos de los socios del club
                        </Text>
                    </Stack>
                    <HStack gap="3">
                        <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                            <LuPlus /> Registrar Certificado médico
                        </Button>
                    </HStack>
                </Flex>

                {/* Modal para registrar certificado médico */}
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Registrar Nuevo Certificado Médico</DialogTitle>
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

                                <Field label="Licencia del médico" required>
                                    <Input
                                        placeholder="Ej. 38190192"
                                        value={formData.licencia_doctor}
                                        onChange={(e) =>
                                            setFormData({ ...formData, licencia_doctor: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de emisión" required>
                                    <Input
                                        type="date"
                                        value={formData.fecha_emision}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fecha_emision: e.target.value })
                                        }
                                        required
                                    />
                                </Field>
                                <Field label="Fecha de vencimiento" required>
                                    <Input
                                        type="date"
                                        value={formData.fecha_vencimiento}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fecha_vencimiento: e.target.value })
                                        }
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
                            placeholder="Buscar certificados médicos por nombre o DNI del socio…"
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
                    ) : filteredMedicalCertificate.length === 0 ? (
                        <Center h="200px">
                            <Text color="fg.muted">
                                {filterQuery.trim() ? "No se encontraron certificados méidocs para el socio buscado." : "No hay certificados médicos registradas."}
                            </Text>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha Emisión</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Fecha Vencimiento</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Está validada</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">Licencia médico</Table.ColumnHeader>
                                    <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {filteredMedicalCertificate.map((d) => {
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
                                                <Button size="sm" colorPalette="red" variant="outline" onClick={() => handleDelete(d.id, d.motivo)}>
                                                    <LuTrash2 /> Eliminar
                                                </Button>
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

        </>
    );
}