from odoo import models, fields, api


class OrgPerson(models.Model):
    _name = 'orgchart.person'
    _description = 'Org Chart Person'
    _rec_name = 'name'

    name = fields.Char(string='Full Name', required=True)
    title = fields.Char(string='Job Title', required=True)
    team = fields.Char(string='Team / Department', required=True)
    manager_id = fields.Many2one(
        'orgchart.person',
        string='Reports To',
        ondelete='set null',
    )
    subordinate_ids = fields.One2many(
        'orgchart.person', 'manager_id',
        string='Direct Reports',
    )

    @api.model
    def get_graph_data(self):
        """Return nodes and links suitable for 3d-force-graph."""
        people = self.search([])
        nodes = [
            {
                'id': str(p.id),
                'name': p.name,
                'title': p.title,
                'team': p.team,
            }
            for p in people
        ]
        links = [
            {
                'source': str(p.manager_id.id),
                'target': str(p.id),
            }
            for p in people if p.manager_id
        ]
        return {'nodes': nodes, 'links': links}
