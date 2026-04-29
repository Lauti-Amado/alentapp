import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberValidator } from '../domain/services/MemberValidator.js';
import { MemberDTO, CreateMemberRequest } from '@alentapp/shared';

export class CreateMemberUseCase {
    constructor(
        private readonly memberRepository: MemberRepository,
        private readonly memberValidator: MemberValidator
    ) {}

    async execute(data: CreateMemberRequest): Promise<MemberDTO> {
        // 1. Validaciones de negocio (centralizadas)
        this.memberValidator.validateEmail(data.email);
        await this.memberValidator.validateDniIsUnique(data.dni);

        const isMinor = this.memberValidator.isMinor(data.birthdate);
        const finalCategory = isMinor ? 'Cadete' : data.category;

        // 2. Persistencia a través de la interfaz (sin saber qué DB es)
        const nuevoSocio = await this.memberRepository.create({
            ...data,
            category: finalCategory,
            status: 'Activo', // Regla de negocio: todos nacen activos
            created_at: new Date().toISOString(),
        });

        return nuevoSocio;
    }
}
