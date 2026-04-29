import { MemberRepository } from '../domain/MemberRepository.js';

export class DeleteMemberUseCase {
    constructor(private readonly memberRepo: MemberRepository) {}

    async execute(id: string): Promise<void> {
        // Validar existencia del miembro
        const existingMember = await this.memberRepo.findById(id);
        if (!existingMember) {
            throw new Error('El miembro no existe');
        }

        // Ejecutar eliminación
        await this.memberRepo.delete(id);
    }
}
