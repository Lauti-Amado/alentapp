import { MemberRepository } from '../domain/MemberRepository.js';
import { MemberDTO } from '@alentapp/shared';

export class GetMembersUseCase {
    constructor(private readonly memberRepo: MemberRepository) {}

    async execute(): Promise<MemberDTO[]> {
        return this.memberRepo.findAll();
    }
}
