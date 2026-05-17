import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberDTO } from '@alentapp/shared';

export class GetMemberByDniUseCase {
    constructor(private readonly memberRepo: MemberRepository) {}

    async execute(dni: string): Promise<MemberDTO> {
        const member = await this.memberRepo.findByDni(dni);
        if (!member) {
            throw new Error('El socio provisto no existe');
        }
        return member;
    }
}
