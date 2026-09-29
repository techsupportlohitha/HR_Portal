import prisma from './config/database';

export const cleanupDepartments = async () => {
  try {
    console.log('Starting duplicate department cleanup...');
    const depts = await prisma.department.findMany();
    
    // Find the good departments to move people to (if they exist)
    const itDept = depts.find(d => d.name === 'IT');
    const hrDept = depts.find(d => d.name === 'HR & Admin');
    const accDept = depts.find(d => d.name === 'Accounts');

    // Names to remove
    const namesToRemove = ['HR&ADMIN-IT', 'HR & ADMIN', 'COMMERCIAL', 'ACCOUNTS', 'PROCUREMENT'];
    
    for (const d of depts) {
      if (namesToRemove.includes(d.name)) {
        // Move employees before deleting
        const employees = await prisma.employee.findMany({ where: { departmentId: d.id } });
        for (const emp of employees) {
          let newDeptId = null;
          if (d.name === 'HR&ADMIN-IT') newDeptId = itDept ? itDept.id : null;
          else if (d.name === 'HR & ADMIN') newDeptId = hrDept ? hrDept.id : null;
          else if (d.name === 'ACCOUNTS') newDeptId = accDept ? accDept.id : null;
          
          await prisma.employee.update({
            where: { id: emp.id },
            data: { departmentId: newDeptId }
          });
          console.log(`Moved employee ${emp.firstName} from ${d.name} to ${newDeptId}`);
        }
        
        // Disconnect trainings
        await prisma.training.updateMany({
          where: { targetDepartmentId: d.id },
          data: { targetDepartmentId: null }
        });
        
        // Delete department
        await prisma.department.delete({ where: { id: d.id } });
        console.log(`Deleted duplicate department: ${d.name}`);
      }
    }
    console.log('Cleanup finished.');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};
