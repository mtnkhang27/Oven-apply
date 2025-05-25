// import { Injectable, CanActivate, ExecutionContext, mixin, SetMetadata } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { PermissionApplication } from '../../modules/permission-applications/entities/permission-application.entity';
// import { PermissionGroup } from '../../modules/permission-groups/entities/permission-group.entity';
// import { Permission } from '../../modules/permissions/entities/permission.entity';
// import { User } from '../../modules/users/entities/user.entity';
// import { PermissionAction } from '../enums/permission.enum';

// export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
// export const Permissions = (resource: string, action: PermissionAction) => SetMetadata('permissions', { resource, action });

// export const Authorize = (resource: string, action: PermissionAction) => {
//   @Injectable()
//   class PermissionGuard implements CanActivate {
//     constructor(
//       public reflector: Reflector,
//       @InjectRepository(User)
//       public usersRepository: Repository<User>,
//       @InjectRepository(PermissionGroup)
//       public permissionGroupsRepository: Repository<PermissionGroup>,
//       @InjectRepository(PermissionApplication)
//       public permissionApplicationsRepository: Repository<PermissionApplication>,
//       @InjectRepository(Permission)
//       public permissionsRepository: Repository<Permission>,
//     ) {}

//     async canActivate(context: ExecutionContext): Promise<boolean> {
//       // Lấy request từ ExecutionContext
//       const httpContext = context.switchToHttp();
//       const request = httpContext.getRequest();
//       const user = request.user;

//       const requiredPermissions = { resource, action };
//       console.log('Required Permissions:', requiredPermissions);

//       if (!user || !requiredPermissions) {
//         console.log('User or permission group not found');
//         return false; 
//       }

//       const userData = await this.usersRepository.findOne({
//         where: { id: user.sub }});

//       if (userData === null) {
//         console.log('User not found');
//         return false; // User not found
//       }
//       const permissionGroup = userData.permissionGroup;
//       console.log('Permission Group in Authorize Guard:', permissionGroup);

//       if (!permissionGroup || !permissionGroup) {
//         return false; // Permission group not found or no permissions associated
//       }
      
//       const permissionApplications = await this.permissionApplicationsRepository.find({
//         where: { permissionGroup: { id: permissionGroup.id } },
//         relations: ['permission'],
//       });
      
//       console.log('Permission Applications:', permissionApplications);

//       return permissionApplications.some(
//         (app) =>
//           app.permission.resource === requiredPermissions.resource &&
//           app.permission.action === requiredPermissions.action,
//       );
//     }
//   }

//   return mixin(PermissionGuard);
// };