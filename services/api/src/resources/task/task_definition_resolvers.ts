import * as R from 'ramda';
import getFieldNames from 'graphql-list-fields';
import { ResolverFn } from '../';
import {
  pubSub,
  createEnvironmentFilteredSubscriber,
} from '../../clients/pubSub';
import {
  knex,
  prepare,
  query,
  isPatchEmpty,
} from '../../util/db';
import { Sql } from './sql';
import EVENTS from './events';
import { Helpers } from './helpers';
import { Helpers as environmentHelpers } from '../environment/helpers';
import { Validators as envValidators } from '../environment/validators';
import { getSqlClient } from '../../clients/sqlClient';
import sql from '../user/sql';
import { BreakingChangeType } from 'graphql';


// All query resolvers

export const advancedTaskDefinitionById = async(
  root,
  id,
  { sqlClient, hasPermission },
  ) => {
    //TODO: we'll need to do a lot of work here when it comes to the permissions system
    // essentially we only want to display the definitions a user has access to via their
    // groups, projects, etc.
    return await adTaskFunctions.advancedTaskDefinitionById(root, id, sqlClient);
}

// TODO
// export const getAdvanceTasksForEnvironments
// export const getAdvancedTasksForProject
// export const getAdvancedTasksForGroup

export const canAdvancedTaskRunInEnvironment = async(root, input, {sqlClient, hasPermission}) => {
  //TODO: this should check first is the task is part of the list of environment, then project, then group, and then global tasks
  // if it can be run, then it should be run.
  return true
}



export const resolveTasksForEnvironment = async(
  root,
  id,
  { sqlClient, hasPermission },
  ) => {
    //TODO: we'll need to do a lot of work here when it comes to the permissions system
    // essentially we only want to display the definitions a user has access to via their
    // groups, projects, etc.
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitions());
    return rows;
}



export const getAllAdvancedTaskDefinitions = async(
  root,
  {
    //   input: {
    //   }
  },
  { sqlClient, hasPermission },
  ) => {
    //TODO: we'll need to do a lot of work here when it comes to the permissions system
    // essentially we only want to display the definitions a user has access to via their
    // groups, projects, etc.
    // const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitions());
    let rows = await adTaskFunctions.advancedTaskDefinitions(root, null, sqlClient)
    return rows;
}

export const getAdvancedTaskDefinitionByName = async(
  root,
  {
    name
  },
  { sqlClient, hasPermission },
  ) => {
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitionByName(name));
    let taskDef = R.prop(0, rows);

    taskDef.taskArguments = await adTaskFunctions.advancedTaskDefinitionArguments(root, taskDef.id, sqlClient)
    return taskDef
}


export const advancedTaskDefinitionArgumentById = async(
  root,
  id,
  { sqlClient, hasPermission },
  ) => {
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitionArgumentById(id));
    return R.prop(0, rows);
}



//Mutation resolvers

const AdvancedTaskDefinitionType = {
  command: "COMMAND",
  image: "IMAGE",
}

export const addAdvancedTaskDefinition = async (
    root,
    {
      input: {
        id,
        name,
        description,
        image,
        type,
        service,
        command,
        created
      },
    },
    { sqlClient, hasPermission },
  ) => {
    //TODO: we need to consider who creates these definitions
    // Essentially, we want whoever creates this to determine the overall access permissions to the task
    // This can be done in the iteration that introduces links to environments/groups/etc.


    // There are two cases, either it's a command, in which case the command + service needs to be part of the definition
    // or it's a legit advanced task and we need an image.

    switch(type) {
      case(AdvancedTaskDefinitionType.image):
        if(!image || 0 === image.length) {
          // throw new Error("Unable to create Advanced task definition, );
        }

      break;
      case(AdvancedTaskDefinitionType.command):

      break;
      default:
        throw new Error("Undefined Advanced Task Definition type passed at creation time: " + type);
      break;
    }



    const {
        info: { insertId },
    } = await query(
      sqlClient,
      Sql.insertAdvancedTaskDefinition(
        {
          id: null,
          name,
          description,
          image,
          created: null,
        }
      ),
    );

    return await adTaskFunctions.advancedTaskDefinitionById(root, insertId, sqlClient);
}

export const addAdvancedTaskDefinitionToProject = async (
  root,
  {
    input: {
      id,
      advancedTaskDefinition,
      project
    },
  },
  { sqlClient, hasPermission },
) => {
  //TODO: we need to consider who creates these definitions
  // Essentially, we want whoever creates this to determine the overall access permissions to the task
  // This can be done in the iteration that introduces links to environments/groups/etc.

  const {
      info: { insertId },
  } = await query(
    sqlClient,
    Sql.insertAdvancedTaskDefinitionProjectLink(
      {
        id: null,
        advanced_task_definition: advancedTaskDefinition,
        project,
      }
    ),
  );

  // let rows = await query(sqlClient,Sql.selectAdvancedTaskDefinitionEnvironmentLinkById(insertId));
  // let row = R.prop(0, rows)
  // console.log(row);
  // let ret = {id: row.id, advancedTask: row.taskDefinition, environment: row.environment}
  // console.log(ret)
  return {id: insertId}
}


export const addAdvancedTaskDefinitionToEnvironment = async (
  root,
  {
    input: {
      id,
      advancedTaskDefinition,
      environment,
    },
  },
  { sqlClient, hasPermission },
) => {
  //TODO: we need to consider who creates these definitions
  // Essentially, we want whoever creates this to determine the overall access permissions to the task
  // This can be done in the iteration that introduces links to environments/groups/etc.

  const {
      info: { insertId },
  } = await query(
    sqlClient,
    Sql.insertAdvancedTaskDefinitionEnvironmentLink(
      {
        id: null,
        advanced_task_definition: advancedTaskDefinition,
        environment,
      }
    ),
  );

  let rows = await query(sqlClient,Sql.selectAdvancedTaskDefinitionEnvironmentLinkById(insertId));
  let row = R.prop(0, rows)
  console.log(row);
  let ret = {id: row.id, advancedTask: row.taskDefinition, environment: row.environment}
  console.log(ret)
  return ret
}



//TODO: DRY out into defs file
const taskStatusTypeToString = R.cond([
    [R.equals('ACTIVE'), R.toLower],
    [R.equals('SUCCEEDED'), R.toLower],
    [R.equals('FAILED'), R.toLower],
    [R.T, R.identity],
  ]);


export const addAdvancedTask: ResolverFn = async (
    root,
    {
      input: {
        id,
        name,
        status: unformattedStatus,
        created,
        started,
        completed,
        environment,
        service,
        advancedTaskId,
        remoteId,
        execute: executeRequest,
        advancedTaskArguments,
      },
    },
    { sqlClient, hasPermission },
  ) => {

    const status = taskStatusTypeToString(unformattedStatus);

    console.log("logging args")
    console.log(advancedTaskArguments)
    console.log("end logging args")

    //There are two kinds of checks we need to make
    // First, can the person currently connected actually run a task on this particular environment
    // second, does this task even connect to the environment at all?
    // This second bit is going to be written now - we resolve tasks at several levels
    // A task is _either_ attached globally, at a group level, at a project level
    // or at an environment level

    await envValidators(sqlClient).environmentExists(environment);
    const envPerm = await environmentHelpers(sqlClient).getEnvironmentById(environment);
    await hasPermission('task', `add:${envPerm.environmentType}`, {
      project: envPerm.project,
    });

    let execute;
    try {
      await hasPermission('task', 'addNoExec', {
        project: envPerm.project,
      });
      execute = executeRequest;
    } catch (err) {
      execute = true;
    }


    //pull advanced task by ID to get the container name
    let addTaskDef = await adTaskFunctions.advancedTaskDefinitionById(root, advancedTaskId, sqlClient)

    // if(addTaskDef.taskArguments.length > 0) {
    //   console.log(addTaskDef)
    //   console.log(validateIncomingArguments(addTaskDef.taskArguments, taskArguments))
    // }


    // the return data here is basically what gets dropped into the DB.
    // what we can do
    const taskData = await Helpers(sqlClient).addAdvancedTask({
      id,
      name,
      status,
      created,
      started,
      completed,
      environment,
      service,
      image: addTaskDef.image,//the return data here is basically what gets dropped into the DB.
      payload: advancedTaskArguments,
      remoteId,
      execute: false,
    });

    return taskData;
  };




  const validateIncomingArguments = (argList, incomingArgs) => {
    return argList.reduce((prv,curr) => { return R.contains({"name":curr.name}, incomingArgs) && prv} , true);
  }



// TODO: question - do we actually want to ever update these tasks, or is it a create/delete only story
// The issue, as I see it, is that if tasks are updated, they may require different arguments - so versioning them makes more sense than updating.

export const deleteAdvancedTaskDefinition = async(
  root,
  {
    input: {
      id
    }
  },
  { sqlClient, hasPermission },
  ) => {
}




const adTaskFunctions = {
  advancedTaskDefinitions: async(root, id, sqlClient) => {
    console.log("here")
    let rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitions());
    console.log(rows.length)
    for(let i = 0; i < rows.length; i++) {
      console.log(rows[i])
      rows[i].advancedTaskDefinitionArguments = await adTaskFunctions.advancedTaskDefinitionArguments(root, rows[i].id, sqlClient)
    }
    console.log("printing rows")
    console.log(rows)
    console.log("printing rows ends")
    return rows
  },
  advancedTaskDefinitionById: async(root, id, sqlClient) => {
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinition(id));
    let taskDef = R.prop(0, rows);
    taskDef.advancedTaskDefinitionArguments = await adTaskFunctions.advancedTaskDefinitionArguments(root, taskDef.id, sqlClient)
    return taskDef
  },
  advancedTaskDefinitionArguments: async(root, task_definition_id, sqlClient) => {
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitionArguments(task_definition_id));
    let taskDefArgs = rows;
    console.log(rows)
    return taskDefArgs
  },
  addAdvancedTaskToEnvironment: async(root, task_definition_id, sqlClient) => {
    const rows = await query(sqlClient, Sql.selectAdvancedTaskDefinitionArguments(task_definition_id));
    console.log(rows)
    let taskDefArgs = rows;
    return taskDefArgs
  },
}