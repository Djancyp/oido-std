-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "order" INTEGER NOT NULL DEFAULT 0,
    "assignedAgentId" TEXT,
    "assignedAgentName" TEXT,
    "dueDate" TEXT,
    "labels" TEXT,
    "runAuto" BOOLEAN NOT NULL DEFAULT false,
    "dependsOn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "Column" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assignedAgentId", "assignedAgentName", "columnId", "createdAt", "description", "dueDate", "id", "labels", "order", "priority", "projectId", "title", "updatedAt") SELECT "assignedAgentId", "assignedAgentName", "columnId", "createdAt", "description", "dueDate", "id", "labels", "order", "priority", "projectId", "title", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_columnId_idx" ON "Task"("columnId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
